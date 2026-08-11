"use client";

import { useState } from "react";
import { Star, X, Check, Award, ThumbsUp } from "lucide-react";
import { doc, updateDoc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

interface TripRatingModalProps {
  reservationId: string;
  targetType: "driver" | "rider";
  targetId: string;
  targetName: string;
  targetPhotoUrl?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TripRatingModal({
  reservationId,
  targetType,
  targetId,
  targetName,
  targetPhotoUrl,
  onClose,
  onSuccess,
}: TripRatingModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const compliments = targetType === "driver" 
    ? ["Punctual & On-Time", "Smooth Driving", "Immaculate Cabin", "Professional Chauffeur", "Great Conversation"]
    : ["Punctual & Ready", "Polite & Respectful", "Great Communication", "Clean Passenger"];

  const toggleBadge = (badge: string) => {
    setSelectedBadges(prev => 
      prev.includes(badge) ? prev.filter(b => b !== badge) : [...prev, badge]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;
    setSubmitting(true);

    try {
      // 1. Update reservation document with rating
      const resRef = doc(db, "reservations", reservationId);
      const ratingField = targetType === "driver" ? "driverRating" : "riderRating";
      const feedbackField = targetType === "driver" ? "driverFeedback" : "riderFeedback";

      await updateDoc(resRef, {
        [ratingField]: rating,
        [feedbackField]: `${feedback} ${selectedBadges.length ? `[${selectedBadges.join(", ")}]` : ""}`.trim(),
      });

      // 2. Transactionally update target aggregate rating (Driver or Rider user doc)
      const targetColl = targetType === "driver" ? "drivers" : "users";
      const targetRef = doc(db, targetColl, targetId);

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(targetRef);
        if (snap.exists()) {
          const data = snap.data();
          const currentRating = data.rating || 5.0;
          const currentCount = data.ratingCount || 0;
          
          const newCount = currentCount + 1;
          const newRating = Number(((currentRating * currentCount + rating) / newCount).toFixed(2));
          
          transaction.update(targetRef, {
            rating: newRating,
            ratingCount: newCount,
          });
        }
      });

      setSubmitted(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error submitting rating:", err);
      alert("Failed to submit rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full">
          <X size={20} />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Check size={32} />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">Thank You!</h3>
            <p className="text-sm text-neutral-500">Your feedback helps maintain 5-star concierge standards.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-brand text-accent font-bold text-2xl flex items-center justify-center mx-auto overflow-hidden border-2 border-accent/40">
                {targetPhotoUrl ? (
                  <img src={targetPhotoUrl} alt={targetName} className="w-full h-full object-cover" />
                ) : (
                  targetName.charAt(0)
                )}
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                Rate your {targetType === "driver" ? "Chauffeur" : "Rider"}
              </h3>
              <p className="text-xs text-neutral-500">{targetName}</p>
            </div>

            {/* Interactive Star Picker */}
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1.5 transition-transform active:scale-95"
                >
                  <Star
                    size={32}
                    className={`transition-colors ${
                      star <= (hoverRating || rating)
                        ? "fill-accent text-accent"
                        : "fill-neutral-200 dark:fill-neutral-800 text-neutral-300 dark:text-neutral-700"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Compliment Badges */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 text-center">Add Compliments</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {compliments.map((badge) => {
                  const isSelected = selectedBadges.includes(badge);
                  return (
                    <button
                      key={badge}
                      type="button"
                      onClick={() => toggleBadge(badge)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        isSelected
                          ? "bg-brand text-accent border-accent"
                          : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800"
                      }`}
                    >
                      {isSelected ? "✓ " : ""}{badge}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Written Comments */}
            <div>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Optional notes or commendations..."
                rows={2}
                className="w-full p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand dark:focus:ring-white resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-brand text-white dark:bg-white dark:text-black font-bold rounded-xl text-sm transition-transform active:scale-95 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Rating"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
