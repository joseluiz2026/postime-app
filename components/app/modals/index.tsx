import { AccountModal } from "./AccountModal";
import { BuildFailedModal } from "./BuildFailedModal";
import { TiktokModal } from "./TiktokModal";
import { UpgradeModal } from "./UpgradeModal";
import { WhatsappModal } from "./WhatsappModal";

export function WizardModals() {
  return (
    <>
      <UpgradeModal />
      <TiktokModal />
      <AccountModal />
      <WhatsappModal />
      <BuildFailedModal />
    </>
  );
}
