import sys

def patch_seed(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    seed_logic = """
  // ---------------------------------------------------------
  // Subscription Plans & Entitlements
  // ---------------------------------------------------------
  const plansData = [
    {
      code: 'FREE',
      name: 'Free Plan',
      description: 'Basic access for evaluating the platform.',
      price: 0,
      currency: 'USD',
      billing_cycle: 'MONTHLY',
      sort_order: 10,
      entitlements: [
        { feature_key: 'projects.max', type: 'INTEGER', value_int: 1 },
        { feature_key: 'users.max', type: 'INTEGER', value_int: 3 },
        { feature_key: 'storage.max_mb', type: 'INTEGER', value_int: 100 },
        { feature_key: 'reports.enabled', type: 'BOOLEAN', value_bool: false },
        { feature_key: 'api.access.enabled', type: 'BOOLEAN', value_bool: false },
      ]
    },
    {
      code: 'BASIC',
      name: 'Basic Plan',
      description: 'For small teams.',
      price: 2900, // 29.00 USD
      currency: 'USD',
      billing_cycle: 'MONTHLY',
      sort_order: 20,
      entitlements: [
        { feature_key: 'projects.max', type: 'INTEGER', value_int: 5 },
        { feature_key: 'users.max', type: 'INTEGER', value_int: 10 },
        { feature_key: 'storage.max_mb', type: 'INTEGER', value_int: 5000 },
        { feature_key: 'reports.enabled', type: 'BOOLEAN', value_bool: true },
        { feature_key: 'api.access.enabled', type: 'BOOLEAN', value_bool: false },
      ]
    },
    {
      code: 'PRO',
      name: 'Pro Plan',
      description: 'For growing construction companies.',
      price: 9900,
      currency: 'USD',
      billing_cycle: 'MONTHLY',
      sort_order: 30,
      entitlements: [
        { feature_key: 'projects.max', type: 'INTEGER', value_int: 50 },
        { feature_key: 'users.max', type: 'INTEGER', value_int: 50 },
        { feature_key: 'storage.max_mb', type: 'INTEGER', value_int: 50000 },
        { feature_key: 'reports.enabled', type: 'BOOLEAN', value_bool: true },
        { feature_key: 'api.access.enabled', type: 'BOOLEAN', value_bool: true },
      ]
    },
    {
      code: 'ENTERPRISE',
      name: 'Enterprise Plan',
      description: 'Unlimited access for large enterprises.',
      price: 49900,
      currency: 'USD',
      billing_cycle: 'MONTHLY',
      sort_order: 40,
      entitlements: [
        { feature_key: 'projects.max', type: 'INTEGER', value_int: 999999 },
        { feature_key: 'users.max', type: 'INTEGER', value_int: 999999 },
        { feature_key: 'storage.max_mb', type: 'INTEGER', value_int: 9999999 },
        { feature_key: 'reports.enabled', type: 'BOOLEAN', value_bool: true },
        { feature_key: 'api.access.enabled', type: 'BOOLEAN', value_bool: true },
      ]
    }
  ];

  for (const planData of plansData) {
    const { entitlements, ...planInfo } = planData;
    const plan = await prisma.subscriptionPlan.upsert({
      where: { code: planInfo.code },
      update: planInfo,
      create: planInfo,
    });
    
    // Seed entitlements
    for (const ent of entitlements) {
      await prisma.entitlement.upsert({
        where: {
          plan_id_feature_key: {
            plan_id: plan.id,
            feature_key: ent.feature_key
          }
        },
        update: {
          type: ent.type as any,
          value_int: ent.value_int,
          value_bool: ent.value_bool
        },
        create: {
          plan_id: plan.id,
          feature_key: ent.feature_key,
          type: ent.type as any,
          value_int: ent.value_int,
          value_bool: ent.value_bool
        }
      });
    }
  }
"""

    permissions_seed = """
    { action: 'subscriptions:read', resource: 'subscription' },
    { action: 'subscriptions:create', resource: 'subscription' },
    { action: 'subscriptions:update', resource: 'subscription' },
    { action: 'subscriptions:delete', resource: 'subscription' },
    { action: 'subscription_plans:read', resource: 'subscription_plan' },
    { action: 'subscription_plans:create', resource: 'subscription_plan' },
    { action: 'subscription_plans:update', resource: 'subscription_plan' },
    { action: 'subscription_plans:delete', resource: 'subscription_plan' },
    { action: 'entitlements:read', resource: 'entitlement' },
    { action: 'entitlements:update', resource: 'entitlement' },
"""

    if "const plansData =" not in content:
        # Insert at end of main function before closing brace or console.log
        content = content.replace("console.log('Seed completed successfully');", seed_logic + "\n  console.log('Seed completed successfully');")
    
    if "subscriptions:read" not in content:
        content = content.replace("    { action: 'notifications:delete', resource: 'notification' },", "    { action: 'notifications:delete', resource: 'notification' }," + permissions_seed)
        
    with open(filepath, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    patch_seed(sys.argv[1])
