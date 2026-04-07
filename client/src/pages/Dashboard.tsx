import React, { useState, useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BudgetAlert {
  category: string;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  overrunPercentage: number;
  confidence: number;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery();

  // Fetch transactions for selected project
  const { data: transactions } = trpc.finance.getTransactions.useQuery(
    { projectId: selectedProject || 0 },
    { enabled: !!selectedProject }
  );

  // Fetch budget tracking
  const { data: budgetTracking } = trpc.finance.getBudgetTracking.useQuery(
    { projectId: selectedProject || 0 },
    { enabled: !!selectedProject }
  );

  // Simulate budget alerts
  useEffect(() => {
    if (budgetTracking) {
      const alerts: BudgetAlert[] = budgetTracking.map((budget: any) => ({
        category: budget.materialCategory,
        status: budget.projectionPercentage > 130 ? 'CRITICAL' : budget.projectionPercentage > 115 ? 'WARNING' : 'OK',
        overrunPercentage: Math.max(0, budget.projectionPercentage - 100),
        confidence: 85,
      }));
      setBudgetAlerts(alerts);
    }
  }, [budgetTracking]);

  // Prepare chart data
  const transactionData = transactions?.map((t: any) => ({
    date: new Date(t.createdAt).toLocaleDateString(),
    amount: parseFloat(t.amount),
    type: t.type,
  })) || [];

  const budgetData = budgetTracking?.map((b: any) => ({
    category: b.materialCategory,
    budgeted: parseFloat(b.budgetedAmount),
    spent: parseFloat(b.spentAmount),
  })) || [];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!user) {
    return <div>Please log in to access the dashboard</div>;
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">BuildAI Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user.name}</p>
      </div>

      {/* Project Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Project</CardTitle>
        </CardHeader>
        <CardContent>
          {projectsLoading ? (
            <Loader2 className="animate-spin w-4 h-4" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects?.map((project: any) => (
                <Button
                  key={project.id}
                  variant={selectedProject === project.id ? 'default' : 'outline'}
                  onClick={() => setSelectedProject(project.id)}
                  className="h-auto flex-col items-start p-4"
                >
                  <div className="font-semibold">{project.name}</div>
                  <div className="text-sm text-gray-600">{project.location}</div>
                  <div className="text-xs text-gray-500 mt-2">Budget: ${project.budget}</div>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProject && (
        <>
          {/* Budget Alerts */}
          {budgetAlerts.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  Budget Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {budgetAlerts.map((alert, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded border border-red-200">
                      <div>
                        <p className="font-semibold">{alert.category}</p>
                        <p className="text-sm text-gray-600">
                          {alert.status === 'CRITICAL' ? 'Critical overrun' : 'Warning'}: {alert.overrunPercentage.toFixed(1)}% over budget
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Confidence: {alert.confidence}%</p>
                        <p className={`text-sm font-semibold ${alert.status === 'CRITICAL' ? 'text-red-600' : 'text-yellow-600'}`}>
                          {alert.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Budget vs Spent Chart */}
          {budgetData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Budget vs Spent</CardTitle>
                <CardDescription>Material category breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={budgetData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="budgeted" fill="#8884d8" name="Budgeted" />
                    <Bar dataKey="spent" fill="#82ca9d" name="Spent" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Transactions Chart */}
          {transactionData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>Recent financial activities</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={transactionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="amount" stroke="#8884d8" name="Amount" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <div className="text-2xl font-bold">
                    ${budgetTracking?.reduce((sum: number, b: any) => sum + parseFloat(b.spentAmount), 0).toFixed(2) || '0.00'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <div className="text-2xl font-bold">
                    ${budgetTracking?.reduce((sum: number, b: any) => sum + parseFloat(b.budgetedAmount), 0).toFixed(2) || '0.00'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Remaining</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <div className="text-2xl font-bold">
                    ${(budgetTracking?.reduce((sum: number, b: any) => sum + (parseFloat(b.budgetedAmount) - parseFloat(b.spentAmount)), 0) || 0).toFixed(2)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
