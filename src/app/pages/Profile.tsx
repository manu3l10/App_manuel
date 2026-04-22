import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, MapPin, Calendar, Award, Camera, Edit, LogOut, Loader2, X, User, FileText, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../contexts/LanguageContext";
import { syncCommunityProfile } from "../../lib/communityApi";

export function Profile() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [user, setUser] = useState<any>(null);
  const [tripCount, setTripCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recentTrips, setRecentTrips] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      setNameInput(user.user_metadata?.full_name || user.email?.split('@')[0] || "");
      setBioInput(user.user_metadata?.bio || "✈️ Amante de los viajes y las aventuras. Explorando el mundo un destino a la vez 🌍");

      const { count, data: tripsData } = await supabase
        .from('trips')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(3);

      setTripCount(count || 0);
      setRecentTrips(tripsData || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getAvatarUrl = () =>
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";

  const getUserInitial = () =>
    user?.user_metadata?.full_name?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "V";

  const getCommunityAuthorName = (targetUser: any = user, fullNameOverride?: string) =>
    fullNameOverride?.trim() ||
    targetUser?.user_metadata?.full_name ||
    targetUser?.user_metadata?.username ||
    targetUser?.email?.split("@")[0] ||
    "viajero";

  const buildDefaultCommunityAvatarFor = (targetUser: any = user, fullNameOverride?: string) => {
    const seed =
      targetUser?.user_metadata?.username ||
      fullNameOverride?.trim() ||
      targetUser?.user_metadata?.full_name ||
      targetUser?.email?.split("@")[0] ||
      "viajero";

    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(String(seed))}`;
  };

  const syncCommunityProfileOrAlert = async (params: {
    targetUser: any;
    authorAvatar: string;
    fullNameOverride?: string;
  }) => {
    try {
      await syncCommunityProfile({
        authorName: getCommunityAuthorName(params.targetUser, params.fullNameOverride),
        authorAvatar: params.authorAvatar,
      });
    } catch (error: any) {
      console.error("Error syncing community profile:", error);
      alert(error?.message ?? "La foto se actualizó, pero no se pudo sincronizar en la comunidad.");
    }
  };

  const getAvatarStoragePath = (avatarUrl: string) => {
    const marker = "/storage/v1/object/public/avatars/";
    const index = avatarUrl.indexOf(marker);
    if (index === -1) return null;

    const pathWithQuery = avatarUrl.slice(index + marker.length);
    return decodeURIComponent(pathWithQuery.split("?")[0]);
  };

  const handleAvatarClick = () => {
    if (avatarUploading) return;
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      alert("Selecciona una imagen valida para tu foto de perfil.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("La foto debe pesar maximo 5 MB.");
      return;
    }

    setAvatarUploading(true);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
    const filePath = `${user.id}/${Date.now()}.${safeExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      setAvatarUploading(false);
      alert("Error subiendo la foto: " + uploadError.message);
      return;
    }

    const { data: publicData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const avatarUrl = publicData.publicUrl;
    const nextMetadata = {
      ...(user.user_metadata ?? {}),
      avatar_url: avatarUrl,
      picture: avatarUrl,
    };

    const { data, error } = await supabase.auth.updateUser({
      data: nextMetadata,
    });

    if (error) {
      setAvatarUploading(false);
      alert("La foto subio, pero no se pudo actualizar el perfil: " + error.message);
      return;
    }

    await syncCommunityProfileOrAlert({
      targetUser: data.user,
      authorAvatar: avatarUrl,
    });

    setUser(data.user);
    setAvatarUploading(false);
  };

  const handleRemoveAvatar = async () => {
    const currentAvatarUrl = getAvatarUrl();
    if (!user || !currentAvatarUrl || avatarUploading) return;

    setAvatarUploading(true);

    const nextMetadata = {
      ...(user.user_metadata ?? {}),
      avatar_url: null,
      picture: null,
    };

    const { data, error } = await supabase.auth.updateUser({
      data: nextMetadata,
    });

    if (error) {
      setAvatarUploading(false);
      alert("No se pudo quitar la foto: " + error.message);
      return;
    }

    const defaultAvatar = buildDefaultCommunityAvatarFor(data.user);

    await syncCommunityProfileOrAlert({
      targetUser: data.user,
      authorAvatar: defaultAvatar,
    });

    const storagePath = getAvatarStoragePath(currentAvatarUrl);
    if (storagePath) {
      await supabase.storage.from("avatars").remove([storagePath]);
    }

    setUser(data.user);
    setAvatarUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...(user?.user_metadata ?? {}),
        full_name: nameInput,
        bio: bioInput
      }
    });

    if (error) {
      alert("Error actualizando perfil: " + error.message);
    } else {
      const authorAvatar =
        data.user?.user_metadata?.avatar_url ||
        data.user?.user_metadata?.picture ||
        buildDefaultCommunityAvatarFor(data.user, nameInput);

      await syncCommunityProfileOrAlert({
        targetUser: data.user,
        authorAvatar,
        fullNameOverride: nameInput,
      });
      setUser(data.user);
      setIsEditing(false);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    if (logoutLoading) return;

    setLogoutLoading(true);
    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
      console.error("Error signing out:", error);
      setLogoutLoading(false);
      return;
    }

    navigate("/", { replace: true });
  };

  const stats = [
    { label: "Países visitados", value: "0", icon: MapPin },
    { label: "Viajes realizados", value: loading ? "..." : tripCount.toString(), icon: Calendar },
    { label: "Insignias", value: "0", icon: Award },
  ];

  const badges: any[] = [];

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
          <h1 className="font-semibold text-gray-900">Perfil</h1>
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 hover:bg-purple-100/50 rounded-lg transition-colors"
          >
            <Edit className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Editing Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setIsEditing(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-lg bg-white rounded-t-[32px] md:rounded-[32px] p-6 md:p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Configuración Perfil</h2>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Form Group: Name */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    NOMBRE DE USUARIO
                  </label>
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all"
                  />
                </div>

                {/* Form Group: Bio */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    TU BIOGRAFÍA
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Cuéntanos sobre tus aventuras..."
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex flex-col gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-purple-200 transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : "Guardar Cambios"}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                    className="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 mb-6"
        >
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="relative mb-4">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleAvatarChange}
                className="hidden"
              />
              {getAvatarUrl() ? (
                <img
                  src={getAvatarUrl()}
                  alt="Foto de perfil"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-semibold">
                  {getUserInitial()}
                </div>
              )}
              <button
                onClick={handleAvatarClick}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-purple-200 hover:bg-purple-50 transition-colors disabled:opacity-70"
                title="Cambiar foto de perfil"
              >
                {avatarUploading ? (
                  <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-purple-600" />
                )}
              </button>
              {getAvatarUrl() && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={avatarUploading}
                  className="absolute bottom-0 left-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-red-100 hover:bg-red-50 transition-colors disabled:opacity-70"
                  title="Eliminar foto de perfil"
                >
                  {avatarUploading ? (
                    <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-red-500" />
                  )}
                </button>
              )}
            </div>

            {/* Name */}
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('menu.user')}
            </h2>
            <p className="text-gray-600 mb-4">{user?.email || "@traveler"}</p>

            {/* Bio */}
            <p className="text-gray-700 max-w-md mb-6 leading-relaxed">
              {user?.user_metadata?.bio || "✈️ Amante de los viajes y las aventuras. Explorando el mundo un destino a la vez 🌍"}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 w-full">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4"
                  >
                    <Icon className="w-5 h-5 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-semibold text-gray-900 mb-1">{stat.value}</p>
                    <p className="text-xs text-gray-600">{stat.label}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Badges */}
        {badges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 mb-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4">Insignias</h3>
            <div className="grid grid-cols-3 gap-3">
              {badges.map((badge, index) => (
                <motion.div
                  key={badge.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className={`bg-gradient-to-br ${badge.color} rounded-xl p-4 text-center text-white shadow-lg`}
                >
                  <div className="text-3xl mb-2">{badge.icon}</div>
                  <p className="text-xs font-medium">{badge.name}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Trips */}
        {recentTrips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 mb-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4">Viajes Recientes</h3>
            <div className="grid grid-cols-3 gap-3">
              {recentTrips.map((trip, index) => (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-2">
                    <img
                      src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZHZlbnR1cmUlMjB0cmF2ZWx8ZW58MXx8fHwxNzczODA1NjUwfDA&ixlib=rb-4.1.0&q=80&w=1080"
                      alt={trip.destination}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{trip.destination}</p>
                  <p className="text-xs text-gray-500">{trip.start_date}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <button
            onClick={() => setIsEditing(true)}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
          >
            <Edit className="w-5 h-5" />
            Editar Perfil
          </button>
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            className="w-full flex items-center justify-center gap-2 bg-white/80 backdrop-blur-xl border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-white transition-colors disabled:cursor-not-allowed disabled:opacity-70"
          >
            {logoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
            Cerrar sesión
          </button>
        </motion.div>
      </div>
    </div>
  );
}
