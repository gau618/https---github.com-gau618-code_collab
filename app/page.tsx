// app/page.tsx
import AuthButton from './components/AuthButton';
import { 
  Code, 
  Users, 
  Video, 
  FileText, 
  Zap, 
  Shield, 
  Globe,
  ArrowRight,
  CheckCircle,
  Star,
  Github
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Code className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Code Collab</span>
            </div>
            <AuthButton />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Code Together,
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                {' '}Build Faster
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Real-time collaborative coding with integrated video chat, file management, 
              and seamless team collaboration. Build amazing projects together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <AuthButton />
              <Button variant="outline" size="lg" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Watch Demo
              </Button>
            </div>
          </div>
        </div>

        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to collaborate
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to make team coding seamless and productive
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <Code className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Real-time Code Editor
              </h3>
              <p className="text-gray-600">
                Collaborate on code in real-time with syntax highlighting, 
                auto-completion, and live cursor tracking.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-2xl border border-green-100">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Integrated Video Chat
              </h3>
              <p className="text-gray-600">
                Communicate face-to-face while coding with built-in video 
                conferencing and screen sharing.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-8 rounded-2xl border border-purple-100">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Smart File Management
              </h3>
              <p className="text-gray-600">
                Organize your project with folders, file trees, and 
                collaborative file editing capabilities.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 p-8 rounded-2xl border border-orange-100">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Team Management
              </h3>
              <p className="text-gray-600">
                Invite team members, manage permissions, and track 
                contributions with role-based access control.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-8 rounded-2xl border border-teal-100">
              <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Lightning Fast
              </h3>
              <p className="text-gray-600">
                Optimized for performance with instant sync, 
                minimal latency, and responsive collaboration.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-8 rounded-2xl border border-pink-100">
              <div className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Secure & Private
              </h3>
              <p className="text-gray-600">
                Your code is protected with enterprise-grade security, 
                encrypted connections, and private rooms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How it works
            </h2>
            <p className="text-xl text-gray-600">
              Get started in minutes, not hours
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Sign In & Create Room
              </h3>
              <p className="text-gray-600">
                Sign in with GitHub and create your first collaborative workspace in seconds.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Invite Your Team
              </h3>
              <p className="text-gray-600">
                Share your room link with team members and start collaborating instantly.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Code Together
              </h3>
              <p className="text-gray-600">
                Write code together in real-time with video chat and file sharing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Professional CTA Section - Matching Upper Theme */}
      <section className="relative py-24 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Subtle background elements matching hero */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full px-6 py-3 mb-8 shadow-sm">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-gray-700 text-sm font-medium">Trusted by 10,000+ developers worldwide</span>
          </div>
          
          {/* Main heading */}
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Ready to transform your
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              {' '}team collaboration?
            </span>
          </h2>
          
          {/* Subheading */}
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Join thousands of developers who have revolutionized their workflow with 
            real-time coding and seamless team collaboration.
          </p>
          
          {/* Benefits list */}
          <div className="flex flex-wrap justify-center gap-8 mb-10">
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-green-600" />
              </div>
              <span className="font-medium">Free to start</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-green-600" />
              </div>
              <span className="font-medium">No credit card required</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-green-600" />
              </div>
              <span className="font-medium">Setup in 30 seconds</span>
            </div>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <AuthButton />
            <Button 
              variant="outline" 
              size="lg" 
              className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
            >
              <Video className="w-4 h-4" />
              Watch 2-min Demo
            </Button>
          </div>
          
          {/* Social proof companies */}
          <div className="border-t border-gray-200 pt-8">
            <p className="text-gray-500 text-sm mb-6">Loved by developers at</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="bg-white border border-gray-200 rounded-lg px-6 py-3 text-gray-600 font-semibold shadow-sm">
                TechCorp
              </div>
              <div className="bg-white border border-gray-200 rounded-lg px-6 py-3 text-gray-600 font-semibold shadow-sm">
                StartupXYZ
              </div>
              <div className="bg-white border border-gray-200 rounded-lg px-6 py-3 text-gray-600 font-semibold shadow-sm">
                DevTeam
              </div>
              <div className="bg-white border border-gray-200 rounded-lg px-6 py-3 text-gray-600 font-semibold shadow-sm">
                CodeStudio
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Footer - Matching Upper Theme */}
      <footer className="bg-white border-t border-gray-200">
        {/* Main footer content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand section */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900">Code Collab</span>
              </div>
              <p className="text-gray-600 mb-6 max-w-md leading-relaxed">
                The ultimate platform for real-time collaborative coding. 
                Build amazing projects together with integrated video chat, 
                file management, and seamless team collaboration.
              </p>
              
              {/* Social links */}
              <div className="flex space-x-3">
                <Button variant="outline" size="sm" className="w-10 h-10 p-0 border-gray-300 hover:bg-gray-50">
                  <Github className="w-4 h-4 text-gray-600" />
                </Button>
                <Button variant="outline" size="sm" className="w-10 h-10 p-0 border-gray-300 hover:bg-gray-50">
                  <Globe className="w-4 h-4 text-gray-600" />
                </Button>
                <Button variant="outline" size="sm" className="w-10 h-10 p-0 border-gray-300 hover:bg-gray-50">
                  <Users className="w-4 h-4 text-gray-600" />
                </Button>
              </div>
            </div>
            
            {/* Product links */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Product</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/features" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/demo" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Live Demo
                  </Link>
                </li>
                <li>
                  <Link href="/integrations" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Integrations
                  </Link>
                </li>
              </ul>
            </div>
            
            {/* Support links */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Support</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/docs" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/help" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/status" className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2">
                    System Status
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Newsletter signup */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Stay updated</h3>
                <p className="text-gray-600">Get the latest features and updates delivered to your inbox.</p>
              </div>
              <div className="flex gap-2 w-full lg:w-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 lg:w-64 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button className="bg-blue-600 hover:bg-blue-700 px-6">
                  Subscribe
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom bar */}
        <div className="border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-gray-600 text-sm">
                <p>&copy; 2025 Code Collab. All rights reserved. Built with ❤️ for developers.</p>
              </div>
              <div className="flex space-x-6 text-sm">
                <Link href="/privacy" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Terms of Service
                </Link>
                <Link href="/cookies" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Cookie Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
