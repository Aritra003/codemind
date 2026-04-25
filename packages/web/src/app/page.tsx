import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { MetricsStrip } from "@/components/landing/MetricsStrip";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { AgentSection } from "@/components/landing/AgentSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-[--bg]">
      <Nav />
      <Hero />
      <MetricsStrip />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorks />
      <AgentSection />
      <CTASection />
      <Footer />
    </main>
  );
}
