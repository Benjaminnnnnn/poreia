import {
  addTripMember,
  listTripMembers,
  removeTripMember,
  updateTripMember,
  type AddTripMemberInput,
  type UpdateTripMemberInput,
} from "@/entities/trip/api/tripsService";
import { useAppAuth } from "@/entities/auth/model/AuthProvider";
import { tripQueryKeys } from "@/entities/trip/model/tripQueryKeys";
import type { TripMemberResponse, TripSession, TripSummaryResponse } from "@/shared/types";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

interface UseTripMembersOptions {
  enabled?: boolean;
  tripId: string;
}

export function useTripMembers({
  enabled = true,
  tripId,
}: UseTripMembersOptions) {
  const {
    state: { authUser },
  } = useAppAuth();
  const queryClient = useQueryClient();
  const [members, setMembers] = useState<TripMemberResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const syncTripSummary = useCallback(
    (summary: TripSummaryResponse) => {
      queryClient.setQueryData<TripSession[]>(
        tripQueryKeys.lists(),
        (trips = []) =>
          trips.map((t) => (t.id === summary.id ? { ...t, ...summary } : t)),
      );
    },
    [queryClient],
  );

  const loadMembers = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextMembers = await listTripMembers(authUser, tripId);
      setMembers(nextMembers);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        getErrorMessage(error, "Failed to load trip collaborators."),
      );
    } finally {
      setIsLoading(false);
    }
  }, [authUser, enabled, tripId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void loadMembers();
  }, [enabled, loadMembers]);

  const addMember = useCallback(
    async (input: AddTripMemberInput) => {
      setIsAdding(true);
      setErrorMessage(null);

      try {
        const result = await addTripMember(authUser, tripId, input);
        syncTripSummary(result.summary);
        setMembers((currentMembers) => {
          const filteredMembers = currentMembers.filter(
            (member) => member.userId !== result.member.userId,
          );
          return [...filteredMembers, result.member].sort((left, right) =>
            Date.parse(left.joinedAt) - Date.parse(right.joinedAt),
          );
        });
        return result.member;
      } catch (error) {
        console.error(error);
        setErrorMessage(getErrorMessage(error, "Failed to add collaborator."));
        return null;
      } finally {
        setIsAdding(false);
      }
    },
    [authUser, syncTripSummary, tripId],
  );

  const updateMember = useCallback(
    async (userId: string, input: UpdateTripMemberInput) => {
      setBusyMemberId(userId);
      setErrorMessage(null);

      try {
        const result = await updateTripMember(authUser, tripId, userId, input);
        syncTripSummary(result.summary);
        setMembers((currentMembers) =>
          currentMembers.map((member) =>
            member.userId === userId ? result.member : member,
          ),
        );
        return result.member;
      } catch (error) {
        console.error(error);
        setErrorMessage(
          getErrorMessage(error, "Failed to update collaborator access."),
        );
        return null;
      } finally {
        setBusyMemberId((currentMemberId) =>
          currentMemberId === userId ? null : currentMemberId,
        );
      }
    },
    [authUser, syncTripSummary, tripId],
  );

  const deleteMember = useCallback(
    async (userId: string) => {
      setBusyMemberId(userId);
      setErrorMessage(null);

      try {
        await removeTripMember(authUser, tripId, userId);
        setMembers((currentMembers) =>
          currentMembers.filter((member) => member.userId !== userId),
        );
        await queryClient.invalidateQueries({ queryKey: tripQueryKeys.lists() });
        return true;
      } catch (error) {
        console.error(error);
        setErrorMessage(
          getErrorMessage(error, "Failed to remove collaborator."),
        );
        return false;
      } finally {
        setBusyMemberId((currentMemberId) =>
          currentMemberId === userId ? null : currentMemberId,
        );
      }
    },
    [authUser, queryClient, tripId],
  );

  return {
    actions: {
      addMember,
      deleteMember,
      updateMember,
    },
    state: {
      busyMemberId,
      errorMessage,
      isAdding,
      isLoading,
      members,
    },
  };
}
