import React, { useState } from "react";
import api from '@/api/firebaseClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Get started with essential pet care tracking",
    features: [
      "Up to 3 pets",
      "Basic care tracking",
      "Health records storage",
      "Appointment reminders",
      "Community rescues access"
    ]
  },
  {
    name: "Premium",
    price: "$6.99",
    period: "/month",
    description: "Unlock all features for complete pet wellness",
    features: [
      "Unlimited pets",
      "Advanced health tracking with AI insights",
      "Priority vet recommendations",
      "24/7 AI pet assistant",
      "Unlimited health records",
      "Priority support"
    ],
    highlighted: true
  }
];

export default function PricingPlans({ onSelectPlan }) {
  const [loading, setLoading] = useState(false);

  const handleSelectPlan = async (planName) => {
    if (planName === "Free") {
      onSelectPlan("free");
      return;
    }

    if (planName === "Premium") {
      setLoading(true);
      try {
        const response = await api.functions.invoke("createCheckoutSession", {
          priceId: "price_1T1J2x4fm8ZBcseoquFQa9G5"
        });
        
        if (response.data?.url) {
          window.location.href = response.data.url;
        }
      } catch (error) {
        console.error("Checkout error:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 p-6 flex items-center justify-center">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">Choose Your Plan</h1>
          <p className="text-slate-400 text-lg">Start free, upgrade anytime for premium features</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className={`h-full ${plan.highlighted ? "border-blue-400/50 ring-2 ring-blue-400/30" : "border-slate-700"}`}>
                <CardContent className="p-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">{plan.name}</h2>
                    <p className="text-slate-400 text-sm mb-4">{plan.description}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      {plan.period && <span className="text-slate-400">{plan.period}</span>}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSelectPlan(plan.name)}
                    disabled={loading}
                    className={`w-full mb-6 ${
                      plan.highlighted
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-slate-700 hover:bg-slate-600 text-white"
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      `Choose ${plan.name}`
                    )}
                  </Button>

                  <div className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}