import { Heart } from "lucide-react";

const footerLinks = {
  Product: ["Templates", "Features", "Pricing", "Integrations", "Roadmap"],
  Resources: ["Help Center", "Guides", "Blog", "Webinars", "Community"],
  Company: ["About", "Careers", "Contact", "Privacy", "Terms"],
  Connect: ["Twitter", "LinkedIn", "Instagram", "Facebook"],
};

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold text-white mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a 
                      href="#" 
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Heart className="h-5 w-5 text-white fill-white" />
              </div>
              <span className="font-semibold text-white">TherapySites</span>
            </div>
            
            <p className="text-sm">
              © 2026 TherapySites. Made with care for therapists everywhere.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
