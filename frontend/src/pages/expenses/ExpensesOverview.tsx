import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ExpensesOverview() {
    const navigate = useNavigate();

    useEffect(() => {
        const year = new Date().getFullYear();
        navigate(`/expenses/${year}`, { replace: true });
    }, [navigate]);

    return <div className="container flex-center">Redirecting...</div>;
}
