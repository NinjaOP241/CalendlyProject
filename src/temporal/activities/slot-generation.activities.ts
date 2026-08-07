import {
  regenerateHostSlots as runSlotGeneration,
  RegenerateHostSlotsInput,
} from "../../services/slot.service.js";

export async function regenerateHostSlotsActivity(
  input: RegenerateHostSlotsInput,
): Promise<void> {
  await runSlotGeneration(input);
}
