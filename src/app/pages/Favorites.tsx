import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Heart, MapPin, Star, Plane, Hotel, Utensils } from "lucide-react";
import { useNavigate } from "react-router";

type FavoriteType = "destination" | "hotel" | "restaurant";

interface Favorite {
  id: number;
  name: string;
  location: string;
  type: FavoriteType;
  image: string;
  rating: number;
  description: string;
}

export function Favorites() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FavoriteType | "all">("all");
  const [favorites, setFavorites] = useState<Favorite[]>([
    {
      id: 1,
      name: "Explora Destinos",
      location: "Recomendado para ti",
      type: "destination",
      image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=1000",
      rating: 5.0,
      description: "Próximamente verás aquí tus lugares favoritos recomendados por la IA.",
    },
  ]);

  const filteredFavorites = filter === "all" ? favorites : favorites.filter((f) => f.type === filter);

  const removeFavorite = (id: number) => {
    setFavorites(favorites.filter((f) => f.id !== id));
  };

  const getTypeIcon = (type: FavoriteType) => {
    switch (type) {
      case "destination":
        return Plane;
      case "hotel":
        return Hotel;
      case "restaurant":
        return Utensils;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/", { state: { openMenu: true } })}
            className="p-2 hover:bg-purple-100/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-semibold text-gray-900">Favoritos</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === "all"
              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
              : "bg-white/80 text-gray-700 hover:bg-white"
              }`}
          >
            Todos ({favorites.length})
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter("destination")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === "destination"
              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
              : "bg-white/80 text-gray-700 hover:bg-white"
              }`}
          >
            <Plane className="w-4 h-4" />
            Destinos ({favorites.filter((f) => f.type === "destination").length})
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter("hotel")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === "hotel"
              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
              : "bg-white/80 text-gray-700 hover:bg-white"
              }`}
          >
            <Hotel className="w-4 h-4" />
            Hoteles ({favorites.filter((f) => f.type === "hotel").length})
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter("restaurant")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === "restaurant"
              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
              : "bg-white/80 text-gray-700 hover:bg-white"
              }`}
          >
            <Utensils className="w-4 h-4" />
            Restaurantes ({favorites.filter((f) => f.type === "restaurant").length})
          </motion.button>
        </div>

        {/* Favorites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFavorites.map((favorite, index) => {
            const Icon = getTypeIcon(favorite.type);
            return (
              <motion.div
                key={favorite.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg border border-white/20 group"
              >
                {/* Image */}
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={favorite.image}
                    alt={favorite.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                  {/* Remove button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => removeFavorite(favorite.id)}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                  </motion.button>

                  {/* Type badge */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1">
                    <Icon className="w-3.5 h-3.5 text-purple-600" />
                  </div>

                  {/* Rating */}
                  <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-semibold">{favorite.rating}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{favorite.name}</h3>
                  <div className="flex items-center gap-1 text-gray-600 text-sm mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{favorite.location}</span>
                  </div>
                  <p className="text-xs text-gray-500">{favorite.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredFavorites.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay favoritos</h3>
            <p className="text-gray-600">Agrega lugares a tus favoritos mientras planeas tus viajes</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
