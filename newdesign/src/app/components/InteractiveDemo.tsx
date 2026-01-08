import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { motion } from "motion/react";
import { Sparkles, Check } from "lucide-react";

export function InteractiveDemo() {
  const [heading, setHeading] = useState("Welcome to Peaceful Minds Therapy");
  const [description, setDescription] = useState("Compassionate care for your mental wellness journey");
  const [buttonText, setButtonText] = useState("Book Appointment");
  const [activeEdit, setActiveEdit] = useState<string | null>(null);

  return (
    <section className="py-24 bg-gradient-to-b from-white to-purple-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl mb-4">
            Updates in <span className="text-purple-600">30 seconds</span>, not 30 minutes
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Click any text on your website to edit it. Changes appear instantly. No saving, no publishing delays.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Instructions */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-purple-100 border-2 border-purple-300 rounded-xl flex items-start gap-4"
          >
            <Sparkles className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold text-purple-900 mb-1">Try it yourself!</p>
              <p className="text-purple-800">Click on any text in the website preview below to edit it in real-time.</p>
            </div>
          </motion.div>

          {/* Browser Mockup with Editable Website */}
          <Card className="overflow-hidden shadow-2xl">
            {/* Browser Chrome */}
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 bg-white rounded-md px-4 py-1.5 text-sm text-gray-600 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  peacefulmindstherapy.com
                </div>
              </div>
            </div>

            {/* Editable Website Preview */}
            <div className="bg-gradient-to-b from-blue-50 to-white p-8 sm:p-16 min-h-[500px] flex flex-col justify-center relative">
              {/* Active edit indicator */}
              {activeEdit && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg flex items-center gap-2"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Check className="h-4 w-4" />
                  </motion.div>
                  Live editing
                </motion.div>
              )}

              <div className="max-w-3xl">
                {/* Editable Heading */}
                <div className="mb-6">
                  <input
                    type="text"
                    value={heading}
                    onChange={(e) => setHeading(e.target.value)}
                    onFocus={() => setActiveEdit("heading")}
                    onBlur={() => setActiveEdit(null)}
                    className={`w-full text-4xl sm:text-5xl font-bold bg-transparent border-2 rounded-lg px-4 py-3 transition-all cursor-pointer ${
                      activeEdit === "heading" 
                        ? "border-purple-500 bg-purple-50 shadow-lg" 
                        : "border-transparent hover:border-purple-200"
                    }`}
                    placeholder="Your heading here"
                  />
                  {activeEdit === "heading" && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-purple-600 mt-2 ml-4"
                    >
                      ✏️ Editing heading - changes appear instantly!
                    </motion.p>
                  )}
                </div>

                {/* Editable Description */}
                <div className="mb-8">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onFocus={() => setActiveEdit("description")}
                    onBlur={() => setActiveEdit(null)}
                    rows={2}
                    className={`w-full text-xl text-gray-700 bg-transparent border-2 rounded-lg px-4 py-3 transition-all resize-none cursor-pointer ${
                      activeEdit === "description" 
                        ? "border-purple-500 bg-purple-50 shadow-lg" 
                        : "border-transparent hover:border-purple-200"
                    }`}
                    placeholder="Your description here"
                  />
                  {activeEdit === "description" && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-purple-600 mt-2 ml-4"
                    >
                      ✏️ Editing description - see it update in real-time!
                    </motion.p>
                  )}
                </div>

                {/* Editable Button */}
                <div className="flex gap-3">
                  <div className="relative inline-block">
                    <input
                      type="text"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      onFocus={() => setActiveEdit("button")}
                      onBlur={() => setActiveEdit(null)}
                      className={`text-center min-w-[200px] bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all cursor-pointer border-2 ${
                        activeEdit === "button" 
                          ? "border-yellow-400 shadow-lg ring-4 ring-yellow-200" 
                          : "border-transparent"
                      }`}
                      placeholder="Button text"
                    />
                    {activeEdit === "button" && (
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -bottom-8 left-0 text-sm text-purple-600 whitespace-nowrap"
                      >
                        ✏️ Even buttons are editable!
                      </motion.p>
                    )}
                  </div>
                  <Button variant="outline" size="lg">
                    Learn More
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Benefits callout */}
          <div className="grid sm:grid-cols-3 gap-6 mt-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-1">No complicated dashboard</h3>
              <p className="text-sm text-gray-600">Edit right on your website, not in confusing menus</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-1">See changes instantly</h3>
              <p className="text-sm text-gray-600">What you see is what your clients get</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-1">Edit once, done</h3>
              <p className="text-sm text-gray-600">No more entering the same info in 3 different places</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}