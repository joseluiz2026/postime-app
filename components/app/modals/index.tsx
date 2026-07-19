import { AccountModal } from "./AccountModal";
import { AutoProgressModal } from "./AutoProgressModal";
import { ElevenModal } from "./ElevenModal";
import { TiktokModal } from "./TiktokModal";
import { UpgradeModal } from "./UpgradeModal";
import { WhatsappModal } from "./WhatsappModal";

export function WizardModals() {
  return (
    <>
      <UpgradeModal />
      <ElevenModal />
      <TiktokModal />
      <AccountModal />
      <WhatsappModal />
      <AutoProgressModal />
    </>
  );
}
