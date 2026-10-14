import { useState } from "react";
import { Plus, X } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import GalleryView from "../../components/gallery/GalleryView";

export default function StaffGallery() {
  const [formOpen, setFormOpen] = useState(false);
  return (
    <>
      <PageHeader
        title="Gallery"
        subtitle="Photos and videos the school shares with the community"
        action={(
          <button className="btn gold" type="button" onClick={() => setFormOpen((open) => !open)}>
            {formOpen ? (<><X aria-hidden="true" /> Cancel</>) : (<><Plus aria-hidden="true" /> Add to Gallery</>)}
          </button>
        )}
      />
      {/* Staff browse the whole school gallery like an admin, but the per-item
          controls only appear on media they uploaded themselves. */}
      <GalleryView canUpload canManage formOpen={formOpen} onFormOpenChange={setFormOpen} />
    </>
  );
}
