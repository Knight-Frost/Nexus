<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * MessageableRecipientController (Tenant)
 *
 * Returns the set of landlords a tenant can start a conversation with,
 * derived exclusively from the tenant's own saved listings.
 *
 * Route (tenant middleware group):
 *   GET /api/tenant/messageable-recipients?q={optional}
 */
class MessageableRecipientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        /** @var User $tenant */
        $tenant = $request->user();
        $q = isset($validated['q']) ? trim($validated['q']) : null;

        // Load saved listings with all relationships needed for the response.
        // Mirrors SavedListingController@index but adds the landlord eager-load.
        $savedListings = $tenant
            ->savedListings()
            ->with(['unit.property', 'primaryPhoto', 'landlord'])
            ->get();

        // Collect all active listing-subject conversations for this tenant in one
        // query to avoid N+1 when looking up existing_conversation_id.
        $listingIds = $savedListings->pluck('id')->all();

        $existingConversations = Conversation::where('status', 'active')
            ->where('subject_type', Listing::class)
            ->whereIn('subject_id', $listingIds)
            ->where(function ($q) use ($tenant) {
                $type = User::class;
                $id = $tenant->id;
                // Tenant can be either participant slot
                $q->where(function ($i) use ($type, $id) {
                    $i->where('participant_one_type', $type)
                        ->where('participant_one_id', $id);
                })->orWhere(function ($i) use ($type, $id) {
                    $i->where('participant_two_type', $type)
                        ->where('participant_two_id', $id);
                });
            })
            ->get()
            ->keyBy('subject_id'); // keyed by listing_id for O(1) lookup

        // Build the recipient list
        $recipients = $savedListings
            ->filter(function (Listing $listing) use ($tenant) {
                // Exclude listings with no landlord
                if (! $listing->landlord instanceof User) {
                    return false;
                }
                // Defensive: exclude self-messaging
                if ((int) $listing->landlord->id === (int) $tenant->id) {
                    return false;
                }

                return true;
            })
            ->map(function (Listing $listing) use ($existingConversations) {
                $landlord = $listing->landlord;
                $property = $listing->unit?->property;

                // Compose location from street_address + city, skipping blanks
                $locationParts = array_filter([
                    $property?->street_address ?? '',
                    $property?->city ?? '',
                ]);
                $location = implode(', ', $locationParts);

                // thumbnail_url: raw path string (frontend prepends /storage/ itself)
                $thumbnailUrl = $listing->primaryPhoto?->path ?? null;

                // Look up pre-loaded active conversation for this listing
                $existingConv = $existingConversations->get($listing->id);

                return [
                    'listing_id' => $listing->id,
                    'listing_title' => $listing->title,
                    'landlord' => [
                        'id' => $landlord->id,
                        'name' => $landlord->full_name,
                        'avatar_url' => $landlord->avatar_url,
                    ],
                    'location' => $location,
                    'thumbnail_url' => $thumbnailUrl,
                    'existing_conversation_id' => $existingConv?->id ?? null,
                ];
            })
            ->values(); // re-index after filter

        // Apply optional case-insensitive search filter in PHP (set is small)
        if ($q !== null && $q !== '') {
            $needle = mb_strtolower($q);

            $recipients = $recipients->filter(function (array $item) use ($needle) {
                return str_contains(mb_strtolower($item['listing_title']), $needle)
                    || str_contains(mb_strtolower($item['landlord']['name']), $needle)
                    || str_contains(mb_strtolower($item['location']), $needle);
            })->values();
        }

        return response()->json($recipients);
    }
}
