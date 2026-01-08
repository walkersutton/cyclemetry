import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "29",
    description: "Perfect for solo practitioners just getting started",
    features: [
      "1 website",
      "5 pages",
      "Online booking integration",
      "Contact forms",
      "Mobile responsive",
      "SSL security",
      "Basic analytics",
      "Email support",
    ],
    cta: "Start free trial",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "59",
    description: "Everything you need for a thriving practice",
    features: [
      "1 website",
      "Unlimited pages",
      "Online booking integration",
      "Advanced contact forms",
      "Mobile responsive",
      "SSL security",
      "Advanced analytics",
      "Priority support",
      "Custom domain included",
      "Remove branding",
      "SEO tools",
    ],
    cta: "Start free trial",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Group Practice",
    price: "99",
    description: "For practices with multiple therapists",
    features: [
      "1 website",
      "Unlimited pages",
      "Multi-therapist booking",
      "Advanced contact forms",
      "Mobile responsive",
      "SSL security",
      "Advanced analytics",
      "Priority support",
      "Custom domain included",
      "Remove branding",
      "SEO tools",
      "Team member profiles",
      "Multiple booking calendars",
    ],
    cta: "Start free trial",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-purple-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl mb-4">
            Simple, <span className="text-purple-600">transparent pricing</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Try any plan free for 14 days. No credit card required. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`p-8 relative ${
                plan.highlighted 
                  ? 'border-2 border-purple-600 shadow-2xl scale-105' 
                  : 'border-2 border-gray-200'
              }`}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white">
                  {plan.badge}
                </Badge>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-6">{plan.description}</p>
                <div className="mb-2">
                  <span className="text-5xl font-bold">${plan.price}</span>
                  <span className="text-gray-600">/month</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className={`w-full ${
                  plan.highlighted 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'bg-gray-900 hover:bg-gray-800'
                }`}
                size="lg"
              >
                {plan.cta}
              </Button>
            </Card>
          ))}
        </div>

        <div className="text-center space-y-4">
          <p className="text-gray-600">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Cancel anytime
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Switch plans easily
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              30-day money-back guarantee
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
