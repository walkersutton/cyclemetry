import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ArrowRight, Check } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const templates = [
  {
    id: 1,
    name: "Peaceful Minds",
    category: "Individual Therapy",
    image: "https://images.unsplash.com/photo-1754294437684-7898b3701ac7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aGVyYXB5JTIwb2ZmaWNlJTIwY2FsbXxlbnwxfHx8fDE3Njc1NTY5NDR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    description: "Warm, welcoming design for individual therapy practices",
    color: "bg-blue-100",
  },
  {
    id: 2,
    name: "Family Connect",
    category: "Family Therapy",
    image: "https://images.unsplash.com/photo-1593689217914-19621b0eac82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZWFjZWZ1bCUyMG1lZGl0YXRpb24lMjBzcGFjZXxlbnwxfHx8fDE3Njc1NTY5NDR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    description: "Bright, friendly layout perfect for family counseling",
    color: "bg-green-100",
  },
  {
    id: 3,
    name: "Modern Wellness",
    category: "Group Practice",
    image: "https://images.unsplash.com/photo-1620312841970-bbcbdbcd5cb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB3b3Jrc3BhY2UlMjBzaW1wbGV8ZW58MXx8fHwxNzY3NTU2OTQ0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    description: "Professional, sleek design for multi-therapist practices",
    color: "bg-purple-100",
  },
  {
    id: 4,
    name: "Serene Space",
    category: "Mindfulness & Meditation",
    image: "https://images.unsplash.com/photo-1743865319071-929ac8a27bcd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsJTIwcHJvZmVzc2lvbmFsJTIwb2ZmaWNlfGVufDF8fHx8MTc2NzU1Njk0NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    description: "Minimal, calming aesthetic for meditation centers",
    color: "bg-rose-100",
  },
];

export function TemplateShowcase() {
  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-purple-100 text-purple-700 hover:bg-purple-100">
            Templates
          </Badge>
          <h2 className="text-4xl sm:text-5xl mb-4">
            Start with a template that <span className="text-purple-600">fits your practice</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose from beautifully designed templates created specifically for therapy practices. 
            Customize everything to match your unique style.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {templates.map((template) => (
            <Card 
              key={template.id} 
              className="group overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer"
            >
              <div className="relative h-64 overflow-hidden bg-gray-100">
                <ImageWithFallback 
                  src={template.image}
                  alt={template.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <Button variant="secondary" className="w-full">
                    Preview Template
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-600">{template.category}</p>
                  </div>
                  <span className={`${template.color} px-3 py-1 rounded-full text-xs font-medium`}>
                    Popular
                  </span>
                </div>
                <p className="text-gray-700 mb-4">{template.description}</p>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Check className="h-3 w-3 text-green-600" />
                    Mobile-ready
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Check className="h-3 w-3 text-green-600" />
                    Online booking
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Check className="h-3 w-3 text-green-600" />
                    Contact forms
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <p className="text-gray-600 mb-4">More templates coming soon for coaches, consultants, and beyond</p>
          <Button variant="outline" size="lg">
            View all templates
          </Button>
        </div>
      </div>
    </section>
  );
}
