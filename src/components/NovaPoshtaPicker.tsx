"use client";

import { useEffect, useRef, useState } from "react";

// Вибір міста й відділення Нової Пошти. Два поля: спочатку місто (пошук із
// підказками), далі відділення саме цього міста. Якщо API недоступне —
// показуємо звичайне поле, щоб оформлення замовлення не блокувалось.

interface City { ref: string; name: string; region: string }
interface Warehouse { ref: string; name: string }

const listStyle: React.CSSProperties = {
  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
  maxHeight: 220, overflowY: "auto", background: "var(--bg-card)",
  border: "1px solid var(--border-light)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
};
const itemStyle: React.CSSProperties = {
  display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
  background: "transparent", border: "none", borderBottom: "1px solid var(--border)",
  color: "var(--text-primary)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)",
};

export default function NovaPoshtaPicker({
  value,
  onChange,
}: {
  /** підсумковий рядок «Місто, Відділення» — саме він іде в замовлення */
  value: string;
  onChange: (v: string) => void;
}) {
  const [cityQuery, setCityQuery] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [city, setCity] = useState<City | null>(null);
  const [citiesOpen, setCitiesOpen] = useState(false);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseQuery, setWarehouseQuery] = useState("");
  const [warehouse, setWarehouse] = useState<string>("");
  const [whOpen, setWhOpen] = useState(false);

  const [failed, setFailed] = useState(false); // API недоступне — ручний ввід
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // пошук міст із затримкою, щоб не бити в API на кожну літеру
  useEffect(() => {
    if (city || cityQuery.trim().length < 2) { setCities([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/np?type=cities&q=${encodeURIComponent(cityQuery.trim())}`);
        const j = await res.json();
        if (!j.ok) throw new Error(j.error);
        setCities(j.items);
        setCitiesOpen(true);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [cityQuery, city]);

  // відділення обраного міста
  useEffect(() => {
    if (!city) { setWarehouses([]); return; }
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/np?type=warehouses&city=${encodeURIComponent(city.ref)}`);
        const j = await res.json();
        if (!j.ok) throw new Error(j.error);
        setWarehouses(j.items);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [city]);

  // клік поза блоком закриває списки
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) { setCitiesOpen(false); setWhOpen(false); }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const pickCity = (c: City) => {
    setCity(c);
    setCityQuery(c.name);
    setCitiesOpen(false);
    setWarehouse("");
    setWarehouseQuery("");
    onChange("");
  };

  const pickWarehouse = (w: Warehouse) => {
    setWarehouse(w.name);
    setWarehouseQuery(w.name);
    setWhOpen(false);
    onChange(`${city?.name}, ${w.name}`);
  };

  const resetCity = () => {
    setCity(null);
    setCityQuery("");
    setWarehouse("");
    setWarehouseQuery("");
    setWarehouses([]);
    onChange("");
  };

  // запасний варіант: API недоступне — просто одне поле
  if (failed) {
    return (
      <div>
        <input
          className="form-input"
          placeholder="Місто та № відділення * (напр. Київ, №12)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
        />
        <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
          Довідник відділень тимчасово недоступний — вкажіть місто й номер відділення вручну.
        </p>
      </div>
    );
  }

  const filteredWh = warehouseQuery.trim() && warehouseQuery !== warehouse
    ? warehouses.filter((w) => w.name.toLowerCase().includes(warehouseQuery.trim().toLowerCase()))
    : warehouses;

  return (
    <div ref={boxRef} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* --- місто --- */}
      <div style={{ position: "relative" }}>
        <input
          className="form-input"
          placeholder="Місто *"
          value={cityQuery}
          onChange={(e) => { setCityQuery(e.target.value); if (city) resetCity(); }}
          onFocus={() => { if (cities.length && !city) setCitiesOpen(true); }}
          autoComplete="off"
        />
        {city && (
          <button
            type="button"
            onClick={resetCity}
            aria-label="Змінити місто"
            style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "transparent", border: "none", color: "var(--text-secondary)",
              cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4,
            }}
          >
            ×
          </button>
        )}
        {citiesOpen && cities.length > 0 && !city && (
          <div style={listStyle}>
            {cities.map((c) => (
              <button key={c.ref} type="button" style={itemStyle} onClick={() => pickCity(c)}>
                {c.name}
                {c.region && <span style={{ color: "var(--text-secondary)", fontSize: 11 }}> · {c.region}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* --- відділення --- */}
      <div style={{ position: "relative" }}>
        <input
          className="form-input"
          placeholder={city ? "Відділення або поштомат *" : "Спочатку оберіть місто"}
          value={warehouseQuery}
          disabled={!city}
          onChange={(e) => { setWarehouseQuery(e.target.value); setWhOpen(true); if (warehouse) { setWarehouse(""); onChange(""); } }}
          onFocus={() => city && setWhOpen(true)}
          autoComplete="off"
          style={{ opacity: city ? 1 : 0.55 }}
        />
        {whOpen && city && filteredWh.length > 0 && (
          <div style={listStyle}>
            {filteredWh.slice(0, 60).map((w) => (
              <button key={w.ref} type="button" style={itemStyle} onClick={() => pickWarehouse(w)}>
                {w.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Завантаження…</span>}
    </div>
  );
}
