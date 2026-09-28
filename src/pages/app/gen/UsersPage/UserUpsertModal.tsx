import { NewUserModal } from "./NewUserModal";
import { EditUserModal } from "./EditUserModal";

import type { User } from "@/interfaces/entities/User.interface";
import type { Role } from "@/interfaces/entities/Role.interface";
import type { CreateUserRequest } from "@/interfaces/api/requests/CreateUserRequest.interface";
import type { UpdateUserRequest } from "@/interfaces/api/requests/UpdateUserRequest.interface";

interface UserUpsertModalProps {
  isOpen: boolean;
  isEditing: boolean;
  user: User | null;
  onClose: () => void;
  tenantId: string;
  roles: Role[];
  isLoadingRoles: boolean;
  onCreate: (data: CreateUserRequest) => void;
  onUpdate: (userId: string, data: UpdateUserRequest) => void;
}

export function UserUpsertModal({
  isOpen,
  isEditing,
  user,
  onClose,
  tenantId,
  roles,
  isLoadingRoles,
  onCreate,
  onUpdate,
}: UserUpsertModalProps) {
  if (isEditing) {
    return (
      <EditUserModal
        isOpen={isOpen}
        onClose={onClose}
        user={user}
        tenantId={tenantId}
        roles={roles}
        isLoadingRoles={isLoadingRoles}
        onSubmit={onUpdate}
      />
    );
  }

  return (
    <NewUserModal
      isOpen={isOpen}
      onClose={onClose}
      tenantId={tenantId}
      roles={roles}
      isLoadingRoles={isLoadingRoles}
      onSubmit={onCreate}
    />
  );
}
