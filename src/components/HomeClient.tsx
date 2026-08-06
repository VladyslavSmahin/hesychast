"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "./Header";
import ProductModal from "./ProductModal";
import Hero from "./Hero";
import Hits from "./Hits";
import FullMenu from "./FullMenu";
import ReviewForm from "./ReviewForm";
import ReviewsList from "./ReviewsList";
import MapSection from "./MapSection";
import AboutSection from "./AboutSection";
import Footer from "./Footer";
import CartDrawer from "./CartDrawer";
import MobileMenu from "./MobileMenu";
import MobileCategoryBar from "./MobileCategoryBar";
import { useCart } from "@/features/cart/CartContext";
import type { NavCategory, Product } from "@/lib/types";

type NavFilter = NonNullable<NavCategory["filter"]>;

const HEADER_OFFSET = 84;

export default function HomeClient() {
  const { add } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [navFilter, setNavFilter] = useState<NavFilter | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalItem, setModalItem] = useState<Product | null>(null);

  // Товар відкривається модалкою поверх каталогу, але адреса змінюється на
  // /tovar/<slug> — посилання можна скопіювати, а «назад» повертає в каталог.
  // Сторінку товару віддає сервер при прямому заході (її ж бачить пошуковик).
  const openProduct = useCallback((item: Product) => {
    setModalItem(item);
    window.history.pushState({ modal: item.slug }, "", `/tovar/${item.slug}`);
  }, []);

  const closeProduct = useCallback(() => {
    setModalItem(null);
    // повертаємось на попередню адресу, якщо модалку відкривали кліком
    if (window.history.state?.modal) window.history.back();
  }, []);

  // кнопка «назад» у браузері має закривати модалку, а не лишати її відкритою
  useEffect(() => {
    const onPop = () => setModalItem(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const handleNavClick = (cat: NavCategory) => {
    if (cat.scrollTo) {
      scrollTo(cat.scrollTo);
      setNavFilter(null);
    } else if (cat.filter) {
      setNavFilter(cat.filter);
      setTimeout(() => scrollTo("menu"), 50);
    } else {
      scrollTo("menu");
    }
  };

  return (
    <>
      <Header
        onCartOpen={() => setCartOpen(true)}
        onNavClick={handleNavClick}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((v) => !v)}
      />
      <Hero
        onCtaOrder={() => setCartOpen(true)}
        onCtaMenu={() => scrollTo("menu")}
      />
      <Hits onAdd={add} onCardClick={openProduct} />
      <FullMenu
        onAdd={add}
        onCardClick={openProduct}
        navFilter={navFilter}
        setNavFilter={setNavFilter}
      />
      <ReviewForm />
      <ReviewsList />
      <MapSection />
      <AboutSection />
      <Footer />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <ProductModal item={modalItem} onClose={closeProduct} onAdd={add} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} onNavClick={handleNavClick} />
      <MobileCategoryBar active={navFilter} onNavClick={handleNavClick} />
    </>
  );
}
