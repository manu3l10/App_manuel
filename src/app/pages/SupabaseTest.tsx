import { useState } from "react";
import { supabase } from "../../lib/supabase";

export function SupabaseTest() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState("");

    const handleSignUp = async () => {
        setStatus("Registrando...");
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        console.log("SIGNUP:", data, error);
        if (error) setStatus("Error: " + error.message);
        else setStatus("Usuario registrado: " + (data.user?.email || "Revisa tu correo"));
    };

    const handleLogin = async () => {
        setStatus("Iniciando sesión...");
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        console.log("LOGIN:", data, error);
        if (error) setStatus("Error: " + error.message);
        else setStatus("Bienvenido: " + data.user?.email);
    };

    const handleCreateTrip = async () => {
        setStatus("Creando viaje...");
        const { data: userData } = await supabase.auth.getUser();

        if (!userData.user) {
            console.log("No estás logueado");
            setStatus("Error: Debes iniciar sesión primero");
            return;
        }

        const { data, error } = await supabase.from('trips').insert({
            user_id: userData.user.id,
            destination: "Medellín",
            start_date: "2026-04-01",
            end_date: "2026-04-05",
            budget: "low"
        });

        console.log("INSERT:", data, error);
        if (error) setStatus("Error INSERT: " + error.message);
        else setStatus("Viaje creado correctamente en 'trips'");
    };

    const handleGetTrips = async () => {
        setStatus("Obteniendo viajes...");
        const { data, error } = await supabase
            .from('trips')
            .select('*');

        console.log("VIAJES:", data);
        if (error) setStatus("Error SELECT: " + error.message);
        else setStatus(`Encontrados ${data?.length || 0} viajes. Revisa la consola (F12)`);
    };

    return (
        <div className="p-10 bg-slate-900 min-h-screen text-white flex flex-col items-center gap-6">
            <h1 className="text-3xl font-bold">Prueba de conexión Supabase</h1>

            <div className="flex flex-col gap-4 bg-slate-800 p-6 rounded-2xl border border-white/10 w-full max-w-md">
                <h2 className="text-xl font-semibold">1. Autenticación</h2>
                <input
                    type="email"
                    placeholder="Email"
                    className="p-3 rounded-lg bg-slate-700 text-white border border-white/20"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    className="p-3 rounded-lg bg-slate-700 text-white border border-white/20"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <div className="flex gap-2">
                    <button onClick={handleSignUp} className="flex-1 p-3 bg-blue-600 rounded-lg font-bold">Sign Up (Reg)</button>
                    <button onClick={handleLogin} className="flex-1 p-3 bg-green-600 rounded-lg font-bold">Login</button>
                </div>
            </div>

            <div className="flex flex-col gap-4 bg-slate-800 p-6 rounded-2xl border border-white/10 w-full max-w-md">
                <h2 className="text-xl font-semibold">2. Base de Datos (trips)</h2>
                <div className="flex flex-col gap-2">
                    <button onClick={handleCreateTrip} className="p-3 bg-cyan-600 rounded-lg font-bold">Paso 8: Crear viaje</button>
                    <button onClick={handleGetTrips} className="p-3 bg-indigo-600 rounded-lg font-bold">Paso 9: Ver viajes</button>
                </div>
            </div>

            <div className="w-full max-w-md p-4 border-t border-white/10 text-center">
                <p className="text-gray-400 font-mono text-sm">Estado actual:</p>
                <p className="text-cyan-400 font-bold">{status || "Esperando acción..."}</p>
            </div>
        </div>
    );
}
