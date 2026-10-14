import { useState } from "react";
import { Plus, X } from "lucide-react";
import AdminShell from "../../components/layout/AdminShell";
import PageHeader from "../../components/ui/PageHeader";
import GalleryView from "../../components/gallery/GalleryView";

export default function AdminGallery() {
  const [formOpen, setFormOpen] = useState(false);
  return (
    <AdminShell>
      <PageHeader
        title="Gallery"
        subtitle="Photos and videos your team shares with the community"
        action={(
          <button className="btn gold" type="button" onClick={() => setFormOpen((open) => !open)}>
            {formOpen ? (<><X aria-hidden="true" /> Cancel</>) : (<><Plus aria-hidden="true" /> Add to Gallery</>)}
          </button>
        )}
      />
      {/* Admins may manage any media in their own school, not just their uploads. */}
      <GalleryView canUpload canManage formOpen={formOpen} onFormOpenChange={setFormOpen} />
    </AdminShell>
  );
}
