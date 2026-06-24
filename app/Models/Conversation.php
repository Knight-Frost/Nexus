<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Conversation Model
 *
 * Phase 1: Schema only (no UI or sending).
 * Phase 2: Messaging endpoints added — scopes and helpers appended below.
 */
class Conversation extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'participant_one_type',
        'participant_one_id',
        'participant_two_type',
        'participant_two_id',
        'subject_type',
        'subject_id',
        'title',
        'status',
        'last_message_at',
        'last_message_by',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
    ];

    public function participantOne()
    {
        return $this->morphTo();
    }

    public function participantTwo()
    {
        return $this->morphTo();
    }

    public function subject()
    {
        return $this->morphTo();
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    // -------------------------------------------------------------------------
    // Phase 2 additions — messaging helpers
    // -------------------------------------------------------------------------

    /**
     * Messages ordered chronologically (ascending).
     */
    public function messagesLatest()
    {
        return $this->hasMany(Message::class)->orderBy('created_at', 'asc');
    }

    /**
     * Scope: conversations in which the given User is either participant.
     */
    public function scopeForParticipant(Builder $query, User $user): Builder
    {
        $type = User::class;
        $id = $user->id;

        return $query->where(function (Builder $q) use ($type, $id) {
            $q->where(function (Builder $inner) use ($type, $id) {
                $inner->where('participant_one_type', $type)
                    ->where('participant_one_id', $id);
            })->orWhere(function (Builder $inner) use ($type, $id) {
                $inner->where('participant_two_type', $type)
                    ->where('participant_two_id', $id);
            });
        });
    }

    /**
     * Whether the given User is one of the two participants.
     */
    public function hasParticipant(User $user): bool
    {
        $type = User::class;
        $id = (int) $user->id;

        return (
            $this->participant_one_type === $type && (int) $this->participant_one_id === $id
        ) || (
            $this->participant_two_type === $type && (int) $this->participant_two_id === $id
        );
    }

    /**
     * Return the participant model that is NOT the given user.
     * Returns null when the relationship cannot be resolved.
     */
    public function otherParticipant(User $user): ?User
    {
        $type = User::class;
        $id = (int) $user->id;

        if ($this->participant_one_type === $type && (int) $this->participant_one_id === $id) {
            // User is participant_one → other is participant_two
            if ($this->participant_two_type === $type) {
                return User::find($this->participant_two_id);
            }

            return null;
        }

        if ($this->participant_two_type === $type && (int) $this->participant_two_id === $id) {
            // User is participant_two → other is participant_one
            if ($this->participant_one_type === $type) {
                return User::find($this->participant_one_id);
            }

            return null;
        }

        return null;
    }
}
