import {
  regenerateHostSlots as runSlotGeneration,
  RegenerateHostSlotsInput,
} from "../../services/slot.service.js";

export async function regenerateHostSlotsActivity(
  input: RegenerateHostSlotsInput,
) {
  // Call the actual service function to regenerate host slots
  await runSlotGeneration(input);
}
