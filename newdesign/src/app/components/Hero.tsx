import { Button } from "./ui/button";
import { ArrowRight, Sparkles, Clock } from "lucide-react";
import { motion } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function Hero() {
  const websiteExamples = [
    {
      image: "https://images.unsplash.com/photo-1754294437684-7898b3701ac7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aGVyYXB5JTIwb2ZmaWNlJTIwY2FsbXxlbnwxfHx8fDE3Njc1NTY5NDR8MA&ixlib=rb-4.1.0&q=80&w=1080",
      name: "Peaceful Minds Therapy",
      time: "Built in 12 minutes"
    },
    {
      image: "https://images.unsplash.com/photo-1593689217914-19621b0eac82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZWFjZWZ1bCUyMG1lZGl0YXRpb24lMjBzcGFjZXxlbnwxfHx8fDE3Njc1NTY5NDR8MA&ixlib=rb-4.1.0&q=80&w=1080",
      name: "Mindful Wellness Center",
      time: "Built in 8 minutes"
    },
    {
      image: "https://images.unsplash.com/photo-1620312841970-bbcbdbcd5cb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB3b3Jrc3BhY2UlMjBzaW1wbGV8ZW58MXx8fHwxNzY3NTU2OTQ0fDA&ixlib=rb-4.1.0&q=80&w=1080",
      name: "Family Therapy Collective",
      time: "Built in 15 minutes"
    },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28 lg:px-8 w-full">
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2 text-white shadow-lg"
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Built for therapy practices</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 text-5xl sm:text-6xl lg:text-7xl max-w-5xl mx-auto leading-tight"
          >
            A beautiful website for your practice.{" "}
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              Ready in minutes.
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto mb-10"
          >
            Other website builders waste your time with complicated interfaces and repetitive tasks. 
            We give you a stunning, professional website that's actually easy to update.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-4"
          >
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg px-8 shadow-xl">
              Start building free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-2">
              Browse templates
            </Button>
          </motion.div>
          <p className="text-sm text-gray-600">
            No credit card • Ready in 5 minutes • 14-day free trial
          </p>
        </div>

        {/* Website Examples Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-3 gap-6 mb-12"
        >
          {websiteExamples.map((example, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="group relative"
            >
              {/* Browser Chrome */}
              <div className="bg-white rounded-t-xl p-3 shadow-sm border-x border-t border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-gray-100 rounded px-3 py-1 text-xs text-gray-500 truncate">
                    {example.name.toLowerCase().replace(/\s+/g, '')}.com
                  </div>
                </div>
              </div>
              
              {/* Website Screenshot Mockup */}
              <div className="relative bg-white rounded-b-xl shadow-2xl overflow-hidden border-x border-b border-gray-200 group-hover:shadow-3xl transition-all duration-300">
                <div className="aspect-[4/3] relative overflow-hidden">
                  {/* Mock website content */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white to-gray-50 p-6">
                    <div className="h-full flex flex-col">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="w-8 h-8 bg-purple-600 rounded-lg" />
                        <div className="flex gap-3">
                          <div className="w-12 h-2 bg-gray-300 rounded" />
                          <div className="w-12 h-2 bg-gray-300 rounded" />
                          <div className="w-12 h-2 bg-gray-300 rounded" />
                        </div>
                      </div>
                      
                      {/* Hero Content */}
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="mb-3">
                          <div className="h-3 bg-gray-800 rounded w-3/4 mb-2" />
                          <div className="h-3 bg-gray-800 rounded w-2/3" />
                        </div>
                        <div className="space-y-1.5 mb-4">
                          <div className="h-1.5 bg-gray-400 rounded w-full" />
                          <div className="h-1.5 bg-gray-400 rounded w-5/6" />
                        </div>
                        <div className="w-24 h-6 bg-purple-600 rounded" />
                      </div>

                      {/* Image */}
                      <div className="absolute right-6 top-24 w-32 h-24 rounded-lg overflow-hidden shadow-lg opacity-80">
                        <ImageWithFallback 
                          src={example.image}
                          alt={example.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/90 via-purple-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <p className="text-white font-medium mb-1">{example.name}</p>
                  <div className="flex items-center gap-1.5 text-white/80 text-sm">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{example.time}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="grid grid-cols-3 gap-8 max-w-3xl mx-auto text-center"
        >
          <div>
            <div className="text-4xl font-bold text-purple-600 mb-2">5 min</div>
            <div className="text-sm text-gray-600">Average setup time</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-purple-600 mb-2">30 sec</div>
            <div className="text-sm text-gray-600">To make an update</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-purple-600 mb-2">$0</div>
            <div className="text-sm text-gray-600">Developer fees</div>
          </div>
        </motion.div>
      </div>
      
      {/* Animated decorative elements */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2]
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400 rounded-full blur-3xl"
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.3, 0.2]
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-400 rounded-full blur-3xl"
      />
    </section>
  );
}
