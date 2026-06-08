import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import ProductEdit from "./pages/ProductEdit.jsx";
import AddProduct from "./pages/AddProduct.jsx";
import Blacklist from "./pages/Blacklist.jsx";
import Settings from "./pages/Settings.jsx";
import ImportAsins from "./pages/ImportAsins.jsx";
import RecycleBin from "./pages/RecycleBin.jsx";
import MarginConfig from "./pages/MarginConfig.jsx";

function App() {
  return (
    <Routes>
      {/* Root now goes to login first */}
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />

      {/* Logged-in area (dashboard etc.) - unchanged */}
      <Route path="/" element={<Layout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:id/edit" element={<ProductEdit />} />
        <Route path="add" element={<AddProduct />} />
        <Route path="blacklist" element={<Blacklist />} />
        <Route path="settings" element={<Settings />} />
        <Route path="import" element={<ImportAsins />} />
        <Route path="recycle-bin" element={<RecycleBin />} />
        <Route path="margin-config" element={<MarginConfig />} />
      </Route>
    </Routes>
  );
}

export default App;