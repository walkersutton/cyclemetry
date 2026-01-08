import { Card } from "./ui/card";
import { Zap, Smartphone, Lock, Sparkles, Calendar, MessageSquare } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning-fast edits",
    description: "Click any text, image, or button to edit. Changes appear instantly—no waiting, no publishing delays.",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  {
    icon: Smartphone,
    title: "Mobile-perfect, always",
    description: "Your site automatically looks amazing on phones, tablets, and desktops. No extra work needed.",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    icon: Sparkles,
    title: "No design skills needed",
    description: "Our templates are professionally designed. Just swap in your content and you're done.",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    icon: Calendar,
    title: "Built-in booking",
    description: "Let clients book appointments directly on your site. Integrates with your calendar seamlessly.",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    icon: Lock,
    title: "Secure & compliant",
    description: "SSL security, regular backups, and privacy-first design. Your practice is in good hands.",
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  {
    icon: MessageSquare,
    title: "Smart contact forms",
    description: "Collect client inquiries with customizable forms. Get notified instantly via email.",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
];

export function Features() {
  return (
    <section className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl mb-4">
            Everything you need, <span className="text-purple-600">nothing you don't</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We've thought of everything so you don't have to. Just focus on your clients.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="p-8 hover:shadow-xl transition-shadow duration-300 border-2 hover:border-purple-200"
            >
              <div className={`${feature.bgColor} ${feature.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
