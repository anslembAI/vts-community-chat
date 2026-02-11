import { SignInCard } from "@/components/auth/sign-in-card";
import { ImmersiveAuthShell } from "@/components/auth/immersive-auth-shell";

export default function Page() {
    return (
        <ImmersiveAuthShell heading="Sign In">
            <SignInCard />
        </ImmersiveAuthShell>
    );
}
