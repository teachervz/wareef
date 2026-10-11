/* ==========================================================================
   cloud-config.js — connection to the teacher's Supabase project
   --------------------------------------------------------------------------
   Fill these from Supabase → Project Settings → API (see README → «المزامنة»):
     url   : Project URL            e.g. "https://abcdefgh.supabase.co"
     key   : anon / publishable key (public by design — the data is protected
             by the password and the row-level security rules in supabase/schema.sql)
     email : the e-mail of the single user created in Supabase → Authentication.
             The teacher never types it; she types the password only.
   Leave url empty to run the site offline in this browser only (old behaviour).
   ========================================================================== */
window.CLOUD_CONFIG = {
  url: "https://dfyejbjvybxzpradoxrc.supabase.co",
  key: "sb_publishable_kE3CD4F86Uw6SgCFRFnosw_7zwg8Zox",
  email: "teacher@wareef.app"
};
