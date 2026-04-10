import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export function useFantasyImportAccess(leagueId) {
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdminAccess() {
      try {
        setAccessLoading(true);
        setAccessError("");
        setIsAdmin(false);

        const storedUser = JSON.parse(localStorage.getItem("auction_user"));
        const memberId = storedUser?.memberId;
        const storedLeagueId = storedUser?.leagueId;
        const role = storedUser?.role;

        if (!memberId || !storedLeagueId) {
          throw new Error("No league session found. Please join the league first.");
        }

        if (storedLeagueId !== leagueId) {
          throw new Error("This page does not belong to your current league session.");
        }

        if (role === "admin") {
          setIsAdmin(true);
          return;
        }

        const { data: memberData, error: memberError } = await supabase
          .from("league_members")
          .select("id, league_id, role")
          .eq("id", memberId)
          .eq("league_id", leagueId)
          .single();

        if (memberError || !memberData) {
          throw new Error("League member not found.");
        }

        if (memberData.role !== "admin") {
          throw new Error("Only league admin can upload fantasy match data.");
        }

        setIsAdmin(true);
      } catch (error) {
        console.error("FantasyImport access error:", error);
        setAccessError(error.message || "Access denied.");
      } finally {
        setAccessLoading(false);
      }
    }

    checkAdminAccess();
  }, [leagueId]);

  return {
    accessLoading,
    accessError,
    isAdmin,
  };
}
