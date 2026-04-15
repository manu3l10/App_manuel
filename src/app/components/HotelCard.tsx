import { motion } from "motion/react";
import { Star, MapPin, Wifi, Coffee, Dumbbell } from "lucide-react";
const HOTEL_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";

interface HotelCardProps {
  name: string;
  location: string;
  rating: number;
  price: string;
  image: string;
  amenities?: string[];
}

export function HotelCard({ name, location, rating, price, image, amenities = [] }: HotelCardProps) {
  const amenityIcons: Record<string, any> = {
    wifi: Wifi,
    breakfast: Coffee,
    gym: Dumbbell,
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl border border-white/20"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src === HOTEL_FALLBACK_IMAGE) return;
            target.src = HOTEL_FALLBACK_IMAGE;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="font-semibold text-sm">{rating}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h4 className="font-semibold text-white mb-1">{name}</h4>
        <div className="flex items-center gap-1 text-gray-300 text-sm mb-3">
          <MapPin className="w-3.5 h-3.5" />
          <span>{location}</span>
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="flex gap-2 mb-3">
            {amenities.map((amenity) => {
              const Icon = amenityIcons[amenity] || Wifi;
              return (
                <div
                  key={amenity}
                  className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20"
                >
                  <Icon className="w-4 h-4 text-purple-300" />
                </div>
              );
            })}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div>
            <span className="text-lg font-semibold text-purple-300">{price}</span>
            <span className="text-sm text-gray-400 ml-1">/ noche</span>
          </div>
          <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all">
            Ver más
          </button>
        </div>
      </div>
    </motion.div>
  );
}
