<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\VerificationRequest;
use App\Services\AuditService;
use App\Services\VerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminVerificationController extends Controller
{
    public function __construct(
        protected VerificationService $verificationService
    ) {}

    /**
     * List all verification requests (paginated, filterable by status).
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['sometimes', 'string', 'in:pending,under_review,approved,rejected,needs_more_information'],
        ]);

        $query = VerificationRequest::with(['user', 'reviewer'])
            ->orderByDesc('submitted_at');

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return response()->json($query->paginate(20));
    }

    /**
     * Show a single verification request.
     */
    public function show(VerificationRequest $verificationRequest): JsonResponse
    {
        return response()->json(
            $verificationRequest->load(['user', 'reviewer', 'documents'])
        );
    }

    /**
     * Approve a verification request.
     */
    public function approve(Request $request, VerificationRequest $verificationRequest): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $req = $this->verificationService->approve(
            req: $verificationRequest,
            admin: $request->user(),
            reason: $validated['reason'] ?? null
        );

        return response()->json([
            'message' => 'Verification request approved.',
            'verification_request' => $req,
        ]);
    }

    /**
     * Reject a verification request.
     */
    public function reject(Request $request, VerificationRequest $verificationRequest): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $req = $this->verificationService->reject(
            req: $verificationRequest,
            admin: $request->user(),
            reason: $validated['reason']
        );

        return response()->json([
            'message' => 'Verification request rejected.',
            'verification_request' => $req,
        ]);
    }

    /**
     * Request more information for a verification request.
     */
    public function requestInfo(Request $request, VerificationRequest $verificationRequest): JsonResponse
    {
        $validated = $request->validate([
            'note' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $req = $this->verificationService->requestMoreInfo(
            req: $verificationRequest,
            admin: $request->user(),
            note: $validated['note']
        );

        return response()->json([
            'message' => 'Additional information requested.',
            'verification_request' => $req,
        ]);
    }

    /**
     * Stream a document for admin moderation review.
     *
     * SECURITY: this route lives behind the admin middleware group, so only an
     * authenticated admin reaches it. Admins (super-admins in the current phase)
     * may view applicant documents in the verification-moderation context; every
     * access is audited. The file is streamed directly — no public URL is created.
     */
    public function downloadDocument(Request $request, Document $document): StreamedResponse|JsonResponse
    {
        if (! Storage::disk($document->disk)->exists($document->stored_path)) {
            return response()->json(['message' => 'File not found on disk.'], 404);
        }

        app(AuditService::class)->log(
            actor: $request->user(),
            action: 'admin_document_viewed',
            subject: $document,
            description: 'Admin viewed a document during moderation',
            metadata: ['document_type' => $document->document_type->value],
            severity: 'warning'
        );

        return Storage::disk($document->disk)->download(
            $document->stored_path,
            $document->original_filename
        );
    }
}
