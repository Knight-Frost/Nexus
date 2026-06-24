<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * NotificationController
 *
 * Handles user notification retrieval and management.
 * Read-only for Phase 3.5 (no delivery logic).
 *
 * NOTE: the `notifications` table is keyed by `user_id` (tenants/landlords).
 * Admins authenticate via a separate model and have no per-user notification
 * stream, so every action here returns a truthful empty result for them — we
 * must NOT query by `$admin->id`, which would collide with a real user's id
 * (IDOR). See the `$request->user() instanceof User` guards below.
 */
class NotificationController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService
    ) {}

    /**
     * Get user's notifications (paginated)
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = (int) $request->input('per_page', 20);

        if (! $user instanceof User) {
            return response()->json($this->emptyPage($perPage));
        }

        $notifications = $this->notificationService->getUserNotifications(
            $user,
            perPage: $perPage
        );

        return response()->json($notifications);
    }

    /**
     * Get user's unread notifications
     */
    public function unread(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json([]);
        }

        $notifications = $this->notificationService->getUnreadNotifications($user);

        return response()->json($notifications);
    }

    /**
     * Get unread count
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();

        $count = $user instanceof User
            ? $this->notificationService->getUnreadCount($user)
            : 0;

        return response()->json([
            'unread_count' => $count,
        ]);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Notification $notification, NotificationService $service): JsonResponse
    {
        // Policy check: User can only mark their own notifications as read
        $this->authorize('update', $notification);

        $service->markAsRead($notification);

        return response()->json([
            'message' => 'Notification marked as read',
        ]);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();

        $count = $user instanceof User
            ? $this->notificationService->markAllAsRead($user)
            : 0;

        return response()->json([
            'message' => "{$count} notifications marked as read",
            'count' => $count,
        ]);
    }

    /**
     * Empty Laravel-paginator-shaped payload (matches the SPA's Paginated<T>).
     */
    private function emptyPage(int $perPage): array
    {
        return [
            'data' => [],
            'current_page' => 1,
            'last_page' => 1,
            'per_page' => $perPage,
            'total' => 0,
        ];
    }
}
