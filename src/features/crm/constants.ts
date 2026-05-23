import type {
  DealStatus,
  LeadStatus,
  LeadType,
  TaskPriority,
  TaskStatus,
} from "./types";

/** Вариант выбора для select-полей. */
export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export const LEAD_TYPE_OPTIONS: SelectOption<LeadType>[] = [
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "renter", label: "Renter" },
  { value: "guest", label: "Guest" },
  { value: "investor", label: "Investor" },
  { value: "commercial", label: "Commercial" },
  { value: "booking", label: "Booking" },
  { value: "valuation", label: "Valuation" },
  { value: "external_agent_website", label: "External website" },
];

export const LEAD_STATUS_OPTIONS: SelectOption<LeadStatus>[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "unqualified", label: "Unqualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

export const DEAL_STATUS_OPTIONS: SelectOption<DealStatus>[] = [
  { value: "open", label: "Open" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export const TASK_STATUS_OPTIONS: SelectOption<TaskStatus>[] = [
  { value: "open", label: "Open" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const TASK_PRIORITY_OPTIONS: SelectOption<TaskPriority>[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

function toLabelMap<T extends string>(
  options: SelectOption<T>[],
): Record<T, string> {
  return Object.fromEntries(
    options.map((option) => [option.value, option.label]),
  ) as Record<T, string>;
}

export const LEAD_TYPE_LABELS = toLabelMap(LEAD_TYPE_OPTIONS);
export const LEAD_STATUS_LABELS = toLabelMap(LEAD_STATUS_OPTIONS);
export const DEAL_STATUS_LABELS = toLabelMap(DEAL_STATUS_OPTIONS);
export const TASK_STATUS_LABELS = toLabelMap(TASK_STATUS_OPTIONS);
export const TASK_PRIORITY_LABELS = toLabelMap(TASK_PRIORITY_OPTIONS);
