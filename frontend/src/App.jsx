import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import ProductEdit from "./pages/ProductEdit.jsx";
import AddProduct from "./pages/AddProduct.jsx";
import AddProductHub from "./pages/AddProductHub.jsx";
import SearchAmazon from "./pages/SearchAmazon.jsx";
import Blacklist from "./pages/Blacklist.jsx";
import ImportAsins from "./pages/ImportAsins.jsx";
import RecycleBin from "./pages/RecycleBin.jsx";
import MarginConfig from "./pages/MarginConfig.jsx";
import Categories from "./pages/Categories.jsx";
import CategoryImport from "./pages/CategoryImport.jsx";
import ImportUrls from "./pages/ImportUrls.jsx";
import Sync from "./pages/Sync.jsx";

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
        <Route path="add" element={<AddProductHub />} />
        <Route path="add/manual" element={<AddProduct />} />
        <Route path="add/asin" element={<ImportAsins />} />
        <Route path="add/search" element={<SearchAmazon />} />
        <Route path="add/category" element={<CategoryImport />} />
        <Route path="add/url" element={<ImportUrls />} />
        <Route path="import" element={<ImportAsins />} />
        <Route path="blacklist" element={<Blacklist />} />
        <Route path="recycle-bin" element={<RecycleBin />} />
        <Route path="margin-config" element={<MarginConfig />} />
        <Route path="categories" element={<Categories />} />
        <Route path="sync" element={<Sync />} />
      </Route>
    </Routes>
  );
}

export default App;