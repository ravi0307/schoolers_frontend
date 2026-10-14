import { useState } from "react";
import { Plus, X } from "lucide-react";
import TeacherShell from "../../components/layout/TeacherShell";
import PageHeader from "../../components/ui/PageHeader";
import GalleryView from "../../components/gallery/GalleryView";

export default function TeacherGallery() {
  const [formOpen, setFormOpen] = useState(false);
  return (
    <TeacherShell>
      <PageHeader
        title="Gallery"
        subtitle="Share photos and videos with parents and the school"
        action={(
          <button className="btn gold" type="button" onClick={() => setFormOpen((open) => !open)}>
            {formOpen ? (<><X aria-hidden="true" /> Cancel</>) : (<><Plus aria-hidden="true" /> Add to Gallery</>)}
          </button>
        )}
      />
      {/* canUpload: teachers may add to the gallery. canManage: they may edit
          and remove their own uploads — controls appear per item, since
          another teacher's photos stay read-only for them. */}
      <GalleryView canUpload canManage formOpen={formOpen} onFormOpenChange={setFormOpen} />
    </TeacherShell>
  );
}
