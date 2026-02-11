import { SignUpCard } from "@/components/auth/sign-up-card";
import { ImmersiveAuthShell } from "@/components/auth/immersive-auth-shell";

export default function Page() {
    return (
        <ImmersiveAuthShell heading="Create Account">
            <SignUpCard />
        </ImmersiveAuthShell>
    );
}
