"use client"

import * as React from "react"

import {
  MembersButton,
  MembersRoleFilter,
  MembersRolePicker,
  MembersViewList,
} from "@/registry/bases/__base__/blocks/members-01/components/members-controls"
import {
  type MemberRole,
  type MembersFilter,
} from "@/registry/bases/__base__/blocks/members-01/lib/members-model"
import { InputSearch } from "@/registry/bases/__base__/ui/input-group"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** What the list shows, and how much of it. */
export function MembersToolbar({
  filter,
  count,
  total,
  hasRows,
  onFilterChange,
  onClear,
}: {
  filter: MembersFilter
  count: number
  total: number
  /** The rows are on screen; over a skeleton a count would be false. */
  hasRows: boolean
  onFilterChange: (filter: MembersFilter) => void
  onClear: () => void
}) {
  const isFiltered = filter.query.trim() !== "" || filter.roles.length > 0

  return (
    <div className="flex min-h-(--density-36) flex-wrap items-center gap-(--density-8)">
      <MembersViewList />
      <InputSearch
        className="w-52 max-w-full"
        aria-label="Search members"
        placeholder="Name, email or team"
        value={filter.query}
        onValueChange={(query) => onFilterChange({ ...filter, query })}
      />
      <MembersRoleFilter
        value={[...filter.roles]}
        icon={
          <IconPlaceholder
            lucide="ListFilterIcon"
            tabler="IconFilter"
            hugeicons="FilterHorizontalIcon"
            phosphor="FunnelSimpleIcon"
            remixicon="RiFilter3Line"
            data-icon="inline-start"
          />
        }
        onValueChange={(roles) => onFilterChange({ ...filter, roles })}
      />
      {isFiltered && (
        <MembersButton variant="ghost" onClick={onClear}>
          <IconPlaceholder
            lucide="XIcon"
            tabler="IconX"
            hugeicons="Cancel01Icon"
            phosphor="XIcon"
            remixicon="RiCloseLine"
            data-icon="inline-start"
          />
          Clear
        </MembersButton>
      )}
      {hasRows && (
        <span
          aria-live="polite"
          className="ms-auto text-(length:--density-text-12) text-muted-foreground tabular-nums"
        >
          {count} of {total}
        </span>
      )}
    </div>
  )
}

/** Takes the toolbar's place while people are selected. */
export function MembersSelectionBar({
  count,
  total,
  onRoleChange,
  onRemove,
  onSelectAll,
  onClear,
}: {
  count: number
  total: number
  onRoleChange: (role: MemberRole) => void
  onRemove: () => void
  onSelectAll: () => void
  onClear: () => void
}) {
  return (
    <div
      role="toolbar"
      aria-label="Selection"
      className="flex min-h-(--density-36) flex-wrap items-center gap-(--density-8)"
    >
      <span
        aria-live="polite"
        className="me-(--density-4) text-(length:--density-text-13) font-medium text-foreground tabular-nums"
      >
        {count} selected
      </span>
      <MembersRolePicker
        label="Change role"
        value={null}
        canBeOwner={false}
        onValueChange={onRoleChange}
        trigger={{
          variant: "outline",
          content: (
            <>
              <IconPlaceholder
                lucide="ShieldIcon"
                tabler="IconShield"
                hugeicons="ShieldIcon"
                phosphor="ShieldIcon"
                remixicon="RiShieldLine"
                data-icon="inline-start"
              />
              Change role
            </>
          ),
        }}
      />
      <MembersButton variant="destructive" size="sm" onClick={onRemove}>
        <IconPlaceholder
          lucide="UserRoundXIcon"
          tabler="IconUserX"
          hugeicons="UserRemove01Icon"
          phosphor="UserMinusIcon"
          remixicon="RiUserUnfollowLine"
          data-icon="inline-start"
        />
        Remove…
      </MembersButton>
      <span className="ms-auto flex items-center gap-(--density-4)">
        {count < total && (
          <MembersButton variant="ghost" size="sm" onClick={onSelectAll}>
            Select all {total}
          </MembersButton>
        )}
        <MembersButton variant="ghost" size="sm" onClick={onClear}>
          Clear
        </MembersButton>
      </span>
    </div>
  )
}
