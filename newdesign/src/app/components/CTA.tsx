import { Button } from "./ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function CTA() {
  return (
    <section className="py-24 bg-gradient-to-br from-purple-600 via-purple-700 to-blue-600 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utb3BhY2l0eT0iLjA1IiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-30" />
      
      <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center relative z-10">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-white backdrop-blur-sm">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm">Limited time: Get 2 months free on annual plans</span>
        </div>
        
        <h2 className="text-4xl sm:text-5xl lg:text-6xl text-white mb-6">
          Ready to build your website in <span className="underline decoration-wavy decoration-yellow-300">minutes</span>?
        </h2>
        
        <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
          Join therapy practices who are spending less time wrestling with their website 
          and more time helping clients.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 text-lg px-8">
            Start your free trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="text-white border-white hover:bg-white/10 text-lg px-8"
          >
            Schedule a demo
          </Button>
        </div>
        
        <p className="text-purple-200 text-sm">
          No credit card required • 14-day free trial • Setup takes 5 minutes
        </p>
      </div>

      {/* Decorative blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-400 rounded-full blur-3xl opacity-20" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-400 rounded-full blur-3xl opacity-20" />
    </section>
  );
}
