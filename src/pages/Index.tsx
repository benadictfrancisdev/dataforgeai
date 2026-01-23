import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import WaveBackground from "@/components/WaveBackground";
import InteractiveWaves from "@/components/InteractiveWaves";
import SeaCreatures from "@/components/SeaCreatures";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <WaveBackground />
      <InteractiveWaves />
      <SeaCreatures />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <Features />
        <HowItWorks />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
