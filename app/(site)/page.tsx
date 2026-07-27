import { Hero } from "@/components/hero/hero";
import { AtmosphereSection } from "@/components/home/atmosphere-section";
import { LiveTournamentsSection } from "@/components/home/live-tournaments-section";
import { ClubFactsSection } from "@/components/home/club-facts-section";
import { HowToJoinSection } from "@/components/home/how-to-join-section";
import { CtaSection } from "@/components/home/cta-section";

export const revalidate = 0;

export default function HomePage() {
  return (
    <>
      <Hero />
      <AtmosphereSection />
      <LiveTournamentsSection />
      <ClubFactsSection />
      <HowToJoinSection />
      <CtaSection />
    </>
  );
}
