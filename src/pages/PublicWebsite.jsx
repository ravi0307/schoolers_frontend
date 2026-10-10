import { useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { getPublicSite, getPublicSiteByName, submitWebsiteQuery } from "../api/website";
import { ErrorBanner, Spinner } from "../components/ui/Primitives";
import PublicSiteCanvas from "../components/site/PublicSiteCanvas";

export default function PublicWebsite() {
  const { schoolId, schoolName } = useParams();
  const fetcher = schoolName
    ? () => getPublicSiteByName(schoolName)
    : () => getPublicSite(schoolId);
  const { data: site, loading, error } = useApi(fetcher, [schoolId, schoolName]);

  if (loading) return <div className="public-site-state"><Spinner /></div>;
  if (error) return <div className="public-site-state"><ErrorBanner message={error} /></div>;

  return (
    <main className="public-site">
      <PublicSiteCanvas
        nodes={site.nodes}
        canvasSize={site.canvas_size}
        canvasBackground={site.canvas_background}
        testimonials={site.testimonials}
        schoolName={site.school_name}
        onContactSubmit={(payload) => submitWebsiteQuery(site.school_id, payload)}
      />
    </main>
  );
}