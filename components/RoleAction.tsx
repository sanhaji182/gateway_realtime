"use client";

import { Button, type ButtonProps } from "@/components/ui/Button";
import { useCanEdit } from "@/hooks/useCanEdit";

export function RoleAction({ title, disabled, ...props }: ButtonProps) {
  const { canEdit, disabledReason } = useCanEdit();
  const isDisabled = disabled || !canEdit;

  return <Button disabled={isDisabled} title={!canEdit ? disabledReason : title} {...props} />;
}
