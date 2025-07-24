import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  MicVocal,
  ScrollText,
  Clock,
  Brain,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import lumiMockup from '../assets/lumiMockup.png'

// Define the Clerk sign-in URL
const CLERK_SIGN_IN_URL = 'https://brief-flamingo-60.accounts.dev/sign-in';

const Navbar: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-md py-4 shadow-lg border-b border-purple-900">
      <div className="container mx-auto px-6 flex justify-between items-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <a href="/" className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-purple-500 tracking-wide">Lumi</a>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-x-4"
        >
          <Button variant="ghost" className="text-lg text-gray-200 hover:text-purple-400 transition-colors">Features</Button>
          <Button variant="ghost" className="text-lg text-gray-200 hover:text-purple-400 transition-colors">Testimonials</Button>
          <Button
            variant="default"
            className="bg-gradient-to-r from-purple-700 to-purple-500 text-white hover:from-purple-800 hover:to-purple-600 px-6 py-3 text-lg rounded-full transition-all duration-300 shadow-lg"
            // Update onClick to redirect to Clerk sign-in
            onClick={() => window.location.href = CLERK_SIGN_IN_URL}
          >
            Sign In
          </Button>
        </motion.div>
      </div>
    </nav>
  );
};

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="bg-gray-900 border border-purple-800 rounded-xl overflow-hidden shadow-xl
                      hover:shadow-purple-700/20 transition-all duration-500
                      transform hover:-translate-y-2 hover:scale-[1.02] cursor-pointer">
        <CardHeader className="flex flex-col items-center text-center p-8">
          <Icon className="h-12 w-12 text-purple-400 mb-4 opacity-90" />
          <CardTitle className="text-2xl font-bold text-gray-50 mb-2">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-400 text-center px-8 pb-8 text-base">
          {description}
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface TestimonialCardProps {
  quote: string;
  name: string;
  avatar: string;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ quote, name, avatar }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center text-center p-4"
    >
      <Card className="bg-gray-900 border border-purple-700/30 rounded-xl shadow-lg
                      hover:shadow-purple-600/20 transition-all duration-500
                      transform hover:-translate-y-1 hover:scale-[1.01] cursor-pointer">
        <CardContent className="p-8">
          <p className="text-lg italic text-gray-100 mb-6 leading-relaxed">"{quote}"</p>
          <div className="flex items-center justify-center">
            <img src={avatar} alt={name} className="h-14 w-14 rounded-full mr-4 border-2 border-purple-400 shadow-md" />
            <span className="font-semibold text-purple-300 text-xl">{name}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-50 relative overflow-hidden font-sans">
      {/* Dynamic Background Pattern: Using purple shades */}
      <div className="absolute inset-0 z-0 opacity-10"
           style={{
             backgroundImage: `radial-gradient(circle at center, rgba(139, 92, 246, 0.1) 0%, transparent 70%), /* Purple-500 */
                               linear-gradient(to bottom right, rgba(168, 85, 247, 0.05) 0%, transparent 50%), /* Purple-600 */
                               linear-gradient(to top left, rgba(139, 92, 246, 0.05) 0%, transparent 50%)`, /* Purple-500 */
             backgroundSize: '150% 150%',
             animation: 'pan-background 60s linear infinite alternate',
           }}>
        
      </div>

      <Navbar />

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-6 py-20 pt-40">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-6xl md:text-8xl font-extrabold leading-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-purple-500 mb-8 drop-shadow-lg"
        >
          Lumi: Your AI Friend, Always There to Listen.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-xl md:text-2xl text-gray-300 max-w-4xl mb-12 leading-relaxed"
        >
          Engage in natural, fluid conversations. Experience the power of voice
          with real-time transcription, making every word count.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Button
            size="lg"
            className="bg-gradient-to-r from-purple-700 to-purple-500 text-white text-xl px-10 py-7 rounded-full shadow-lg hover:from-purple-800 hover:to-purple-600
                       transition-all duration-300 group font-bold tracking-wide transform hover:scale-105"
            // Update onClick to redirect to Clerk sign-in
            onClick={() => window.location.href = CLERK_SIGN_IN_URL}
          >
            Start Your Free Conversation
            <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform duration-300" />
          </Button>
        </motion.div>
        {/* Placeholder for AI Illustration/App Mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-24 w-full max-w-5xl relative z-10"
        >
          <img
            src={lumiMockup}
            alt="Lumi App Interface"
            className="rounded-2xl shadow-2xl border border-purple-700/50 mx-auto transform hover:scale-[1.005] transition-transform duration-500"
          />
          <div className="absolute inset-0 rounded-2xl ring-4 ring-purple-500/30 animate-pulse-ring"></div>
        
        </motion.div>
      </section>

      {/* How Lumi Works (Features) Section */}
      <section className="container mx-auto py-32 px-6" id="features">
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-5xl md:text-6xl font-bold text-center mb-20 text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-purple-500 drop-shadow-md"
        >
          How Lumi Works
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          <FeatureCard
            icon={MicVocal}
            title="Natural Voice Chat"
            description="Engage in fluid, lifelike conversations with Lumi, just like talking to a friend. Our advanced AI ensures natural turn-taking and context awareness."
          />
          <FeatureCard
            icon={ScrollText}
            title="Instant Transcription"
            description="See every word you speak transcribed in real-time, ensuring clarity, easy review, and a seamless visual record of your conversation."
          />
          <FeatureCard
            icon={Brain}
            title="Personalized Understanding"
            description="Lumi learns and adapts to your unique communication style, providing more relevant and insightful responses that evolve with you."
          />
          <FeatureCard
            icon={Clock}
            title="24/7 Availability"
            description="Your AI friend is always on call, ready to chat whenever you need to talk, offering support and companionship at any hour."
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Private & Secure"
            description="Your conversations are encrypted and confidential. We prioritize your privacy with robust security measures, ensuring a safe space."
          />
          <FeatureCard
            icon={ArrowRight}
            title="Ever-Evolving"
            description="Lumi constantly learns and improves through advanced AI models, bringing you new features and even better, more intuitive interactions over time."
          />
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container mx-auto py-32 px-6" id="testimonials">
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-5xl md:text-6xl font-bold text-center mb-20 text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-purple-500 drop-shadow-md"
        >
          What Users Are Saying
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          <TestimonialCard
            quote="Lumi has been an incredible companion. The voice recognition is flawless, and it genuinely feels like someone's listening, providing thoughtful responses."
            name="Priya Sharma"
            avatar="https://api.dicebear.com/7.x/adventurer/svg?seed=Priya&flip=true"
          />
          <TestimonialCard
            quote="I use Lumi for brainstorming ideas, and the real-time transcription is a lifesaver. Never miss a thought or a key insight during creative sessions!"
            name="Rahul Kumar"
            avatar="https://api.dicebear.com/7.x/adventurer/svg?seed=Rahul"
          />
          <TestimonialCard
            quote="It's amazing how natural the conversations feel. Lumi truly understands the context and nuances, and it's always there when I need to vent or just chat."
            name="Anjali Singh"
            avatar="https://api.dicebear.com/7.x/adventurer/svg?seed=Anjali"
          />
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 py-28 px-6 text-center shadow-inner">
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-5xl md:text-6xl font-bold text-gray-50 mb-10 leading-tight"
        >
          Ready to experience a new kind of connection?
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Button
            size="lg"
            className="bg-gradient-to-r from-purple-700 to-purple-500 text-white text-xl px-10 py-7 rounded-full shadow-xl hover:from-purple-800 hover:to-purple-600
                       transition-all duration-300 group font-bold tracking-wide transform hover:scale-105"
            // Update onClick to redirect to Clerk sign-in
            onClick={() => window.location.href = CLERK_SIGN_IN_URL}
          >
            Join Lumi Today
            <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform duration-300" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12 px-6 text-gray-400 text-center border-t border-gray-800">
        <div className="container mx-auto flex flex-col items-center">
          <p className="text-lg mb-6">&copy; {new Date().getFullYear()} Lumi. All rights reserved.</p>
          <div className="mt-4 flex justify-center space-x-8 text-lg">
            <a href="#" className="hover:text-purple-400 transition-colors duration-300">Privacy Policy</a>
            <a href="#" className="hover:text-purple-400 transition-colors duration-300">Terms of Service</a>
            <a href="#" className="hover:text-purple-400 transition-colors duration-300">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
};