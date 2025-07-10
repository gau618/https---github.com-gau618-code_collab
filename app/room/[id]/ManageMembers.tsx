// app/room/[id]/ManageMembers.tsx
"use client";

import { useTransition } from "react";
import { Membership, User } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, UserCog, Trash2 } from "lucide-react";
import { updateMemberRole, removeMember } from "@/app/actions";

type MemberWithUser = Membership & {
  user: Pick<User, "name" | "image" | "id">;
};

type Props = {
  roomId: string;
  currentUserId: string;
  members: MemberWithUser[];
};

export default function ManageMembers({
  roomId,
  members,
  currentUserId,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (
    targetUserId: string,
    role: "ADMIN" | "PARTICIPANT"
  ) => {
    startTransition(() => {
      updateMemberRole(roomId, targetUserId, role).catch((err) =>
        alert(err.message)
      );
    });
  };

  const handleRemoveMember = (targetUserId: string) => {
    if (confirm("Are you sure you want to remove this member?")) {
      startTransition(() => {
        removeMember(roomId, targetUserId).catch((err) => alert(err.message));
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-black text-white text-sm px-3 py-1"
        >
          Manage Members
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Room Members</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {members.map(({ user, role }) => (
            <div key={user.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={user.image || ""}
                  alt={user.name || ""}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-gray-400">{role}</p>
                </div>
              </div>
              {/* Don't show controls for the current user */}
              {user.id !== currentUserId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => handleRoleChange(user.id, "ADMIN")}
                      disabled={role === "ADMIN"}
                    >
                      <UserCog className="mr-2 h-4 w-4" /> Make Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleRoleChange(user.id, "PARTICIPANT")}
                      disabled={role === "PARTICIPANT"}
                    >
                      <UserCog className="mr-2 h-4 w-4" /> Make Participant
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-500"
                      onClick={() => handleRemoveMember(user.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Remove Member
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
