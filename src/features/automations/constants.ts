/** Поддерживаемые триггеры автоматизаций. */
export const AUTOMATION_TRIGGERS = ["lead.created", "booking.created"] as const;
export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];

/** Поддерживаемые типы шагов. */
export const AUTOMATION_STEP_TYPES = ["delay", "send_email"] as const;
export type AutomationStepType = (typeof AUTOMATION_STEP_TYPES)[number];

export function isAutomationTrigger(value: string): value is AutomationTrigger {
  return (AUTOMATION_TRIGGERS as readonly string[]).includes(value);
}

export function isAutomationStepType(value: string): value is AutomationStepType {
  return (AUTOMATION_STEP_TYPES as readonly string[]).includes(value);
}

/** Доступные переменные подстановки в шаге send_email. */
export const AUTOMATION_VARIABLES = [
  "first_name",
  "full_name",
  "company_name",
] as const;
