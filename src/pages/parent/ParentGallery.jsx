import PageHeader from "../../components/ui/PageHeader";
import GalleryView from "../../components/gallery/GalleryView";

export default function ParentGallery() {
  return (
    <>
      <PageHeader title="Gallery" subtitle="Photos and videos from your child's school" />
      <GalleryView empty="No gallery photos or videos have been shared yet." />
    </>
  );
}