import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./app/styles.css";
import { DemoProvider } from "./app/store";
import { Landing } from "./app/pages/Landing";
import { Aturan } from "./app/pages/Aturan";
import { Daftar } from "./app/pages/Daftar";
import { KantorMaya } from "./app/pages/KantorMaya";
import { Admin } from "./app/pages/Admin";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DemoProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/aturan" element={<Aturan />} />
          <Route path="/daftar" element={<Daftar />} />
          <Route path="/mitra" element={<KantorMaya />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </DemoProvider>
  </StrictMode>,
);
