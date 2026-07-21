import { Hero } from "@/components/hero/hero";
import { AtmosphereSection } from "@/components/home/atmosphere-section";
import { LiveTournamentsSection } from "@/components/home/live-tournaments-section";
import { SocialProofSection } from "@/components/home/social-proof-section";
import { CtaSection } from "@/components/home/cta-section";

export const revalidate = 0;

export default function HomePage() {
  return (
    <>
      <Hero />
      <AtmosphereSection />
      <LiveTournamentsSection />
      <SocialProofSection />
      <CtaSection />
    </>
  );
}
