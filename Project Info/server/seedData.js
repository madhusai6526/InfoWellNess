const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config.env' });

// Import models
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');

// Sample data
const sampleUsers = [
  {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    role: 'admin'
  },
  {
    username: 'jane_smith',
    email: 'jane@example.com',
    password: 'password123',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'member'
  },
  {
    username: 'mike_wilson',
    email: 'mike@example.com',
    password: 'password123',
    firstName: 'Mike',
    lastName: 'Wilson',
    role: 'member'
  },
  {
    username: 'sarah_jones',
    email: 'sarah@example.com',
    password: 'password123',
    firstName: 'Sarah',
    lastName: 'Jones',
    role: 'member'
  },
  {
    username: 'alex_brown',
    email: 'alex@example.com',
    password: 'password123',
    firstName: 'Alex',
    lastName: 'Brown',
    role: 'viewer'
  }
];

const sampleProjects = [
  {
    name: 'E-commerce Website Redesign',
    description: 'Complete redesign of the company e-commerce platform with modern UI/UX and improved performance.',
    status: 'active',
    priority: 'high',
    tags: ['design', 'frontend', 'ecommerce'],
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-06-30')
  },
  {
    name: 'Mobile App Development',
    description: 'Development of a cross-platform mobile application for iOS and Android.',
    status: 'active',
    priority: 'urgent',
    tags: ['mobile', 'react-native', 'app'],
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-08-15')
  },
  {
    name: 'Database Migration',
    description: 'Migrate from legacy database system to modern cloud-based solution.',
    status: 'on-hold',
    priority: 'medium',
    tags: ['database', 'migration', 'backend'],
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-09-30')
  },
  {
    name: 'API Documentation',
    description: 'Create comprehensive API documentation for all backend services.',
    status: 'active',
    priority: 'low',
    tags: ['documentation', 'api', 'backend'],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-04-30')
  },
  {
    name: 'Security Audit',
    description: 'Comprehensive security audit of all systems and applications.',
    status: 'active',
    priority: 'high',
    tags: ['security', 'audit', 'compliance'],
    startDate: new Date('2024-02-15'),
    endDate: new Date('2024-05-15')
  }
];

const sampleTasks = [
  // E-commerce Website Redesign tasks
  {
    title: 'Design Homepage Layout',
    description: 'Create wireframes and mockups for the new homepage design.',
    status: 'done',
    priority: 'high',
    estimatedHours: 16,
    actualHours: 18,
    tags: ['design', 'wireframes', 'homepage']
  },
  {
    title: 'Implement Responsive Navigation',
    description: 'Build responsive navigation menu with mobile-first approach.',
    status: 'in-progress',
    priority: 'high',
    estimatedHours: 12,
    actualHours: 8,
    tags: ['frontend', 'responsive', 'navigation']
  },
  {
    title: 'Product Catalog Page',
    description: 'Design and implement the product listing and detail pages.',
    status: 'todo',
    priority: 'medium',
    estimatedHours: 24,
    tags: ['frontend', 'catalog', 'products']
  },
  {
    title: 'Shopping Cart Functionality',
    description: 'Implement add to cart, cart management, and checkout flow.',
    status: 'todo',
    priority: 'high',
    estimatedHours: 32,
    tags: ['frontend', 'cart', 'checkout']
  },
  {
    title: 'Payment Integration',
    description: 'Integrate Stripe payment gateway for secure transactions.',
    status: 'todo',
    priority: 'urgent',
    estimatedHours: 20,
    tags: ['backend', 'payments', 'stripe']
  },

  // Mobile App Development tasks
  {
    title: 'App Architecture Setup',
    description: 'Set up project structure and configure development environment.',
    status: 'done',
    priority: 'high',
    estimatedHours: 8,
    actualHours: 6,
    tags: ['setup', 'architecture', 'react-native']
  },
  {
    title: 'User Authentication Screens',
    description: 'Create login, registration, and password reset screens.',
    status: 'in-progress',
    priority: 'high',
    estimatedHours: 16,
    actualHours: 12,
    tags: ['frontend', 'auth', 'screens']
  },
  {
    title: 'Main Dashboard',
    description: 'Design and implement the main app dashboard with key metrics.',
    status: 'todo',
    priority: 'medium',
    estimatedHours: 20,
    tags: ['frontend', 'dashboard', 'metrics']
  },
  {
    title: 'Push Notifications',
    description: 'Implement push notification system for user engagement.',
    status: 'todo',
    priority: 'low',
    estimatedHours: 16,
    tags: ['backend', 'notifications', 'push']
  },

  // Database Migration tasks
  {
    title: 'Legacy Data Analysis',
    description: 'Analyze existing database structure and data relationships.',
    status: 'done',
    priority: 'medium',
    estimatedHours: 12,
    actualHours: 14,
    tags: ['analysis', 'database', 'legacy']
  },
  {
    title: 'Migration Strategy Planning',
    description: 'Plan the migration approach and create detailed timeline.',
    status: 'in-progress',
    priority: 'medium',
    estimatedHours: 8,
    actualHours: 6,
    tags: ['planning', 'strategy', 'migration']
  },
  {
    title: 'Data Validation Scripts',
    description: 'Create scripts to validate data integrity during migration.',
    status: 'todo',
    priority: 'high',
    estimatedHours: 16,
    tags: ['scripts', 'validation', 'data']
  },

  // API Documentation tasks
  {
    title: 'API Endpoint Inventory',
    description: 'Create comprehensive list of all API endpoints.',
    status: 'done',
    priority: 'low',
    estimatedHours: 6,
    actualHours: 5,
    tags: ['documentation', 'inventory', 'endpoints']
  },
  {
    title: 'Swagger Documentation',
    description: 'Generate OpenAPI/Swagger documentation for all endpoints.',
    status: 'in-progress',
    priority: 'medium',
    estimatedHours: 20,
    actualHours: 12,
    tags: ['swagger', 'openapi', 'documentation']
  },
  {
    title: 'Code Examples',
    description: 'Create code examples in multiple programming languages.',
    status: 'todo',
    priority: 'low',
    estimatedHours: 16,
    tags: ['examples', 'code', 'documentation']
  },

  // Security Audit tasks
  {
    title: 'Vulnerability Assessment',
    description: 'Run automated security scans and identify vulnerabilities.',
    status: 'in-progress',
    priority: 'high',
    estimatedHours: 12,
    actualHours: 8,
    tags: ['security', 'vulnerability', 'scanning']
  },
  {
    title: 'Penetration Testing',
    description: 'Conduct manual penetration testing on critical systems.',
    status: 'todo',
    priority: 'urgent',
    estimatedHours: 40,
    tags: ['security', 'penetration', 'testing']
  },
  {
    title: 'Security Report',
    description: 'Compile comprehensive security audit report with recommendations.',
    status: 'todo',
    priority: 'medium',
    estimatedHours: 16,
    tags: ['report', 'security', 'recommendations']
  }
];

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clear existing data
const clearData = async () => {
  try {
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    console.log('Cleared existing data');
  } catch (error) {
    console.error('Error clearing data:', error);
  }
};

// Seed users
const seedUsers = async () => {
  try {
    const users = [];
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      users.push({
        ...userData,
        password: hashedPassword
      });
    }
    
    const createdUsers = await User.insertMany(users);
    console.log(`Created ${createdUsers.length} users`);
    return createdUsers;
  } catch (error) {
    console.error('Error seeding users:', error);
    return [];
  }
};

// Seed projects
const seedProjects = async (users) => {
  try {
    const projects = [];
    for (let i = 0; i < sampleProjects.length; i++) {
      const projectData = sampleProjects[i];
      const owner = users[i % users.length];
      const members = users.filter((_, index) => index !== i % users.length).slice(0, 2);
      
      projects.push({
        ...projectData,
        owner: owner._id,
        members: members.map(user => ({
          user: user._id,
          role: Math.random() > 0.5 ? 'member' : 'viewer'
        }))
      });
    }
    
    const createdProjects = await Project.insertMany(projects);
    console.log(`Created ${createdProjects.length} projects`);
    return createdProjects;
  } catch (error) {
    console.error('Error seeding projects:', error);
    return [];
  }
};

// Seed tasks
const seedTasks = async (users, projects) => {
  try {
    const tasks = [];
    let taskIndex = 0;
    
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const projectTasks = sampleTasks.filter((_, index) => 
        Math.floor(index / 5) === i
      );
      
      for (let j = 0; j < projectTasks.length; j++) {
        const taskData = projectTasks[j];
        const createdBy = users[Math.floor(Math.random() * users.length)];
        const assignees = users.slice(0, Math.floor(Math.random() * 3) + 1);
        
        // Set due dates based on project timeline
        const dueDate = new Date(project.startDate);
        dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 30) + 15);
        
        tasks.push({
          ...taskData,
          project: project._id,
          createdBy: createdBy._id,
          assignees: assignees.map(user => ({ user: user._id })),
          dueDate: dueDate,
          order: taskIndex++
        });
      }
    }
    
    const createdTasks = await Task.insertMany(tasks);
    console.log(`Created ${createdTasks.length} tasks`);
    return createdTasks;
  } catch (error) {
    console.error('Error seeding tasks:', error);
    return [];
  }
};

// Main seeding function
const seedData = async () => {
  try {
    await connectDB();
    await clearData();
    
    const users = await seedUsers();
    if (users.length === 0) {
      console.error('Failed to seed users');
      return;
    }
    
    const projects = await seedProjects(users);
    if (projects.length === 0) {
      console.error('Failed to seed projects');
      return;
    }
    
    const tasks = await seedTasks(users, projects);
    if (tasks.length === 0) {
      console.error('Failed to seed tasks');
      return;
    }
    
    console.log('\n✅ Database seeded successfully!');
    console.log(`📊 Users: ${users.length}`);
    console.log(`📁 Projects: ${projects.length}`);
    console.log(`✅ Tasks: ${tasks.length}`);
    console.log('\nSample login credentials:');
    console.log('Email: john@example.com, Password: password123');
    console.log('Email: jane@example.com, Password: password123');
    
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the seeding
if (require.main === module) {
  seedData();
}

// Seed only if collections are empty (non-destructive)
const seedIfEmpty = async () => {
  let createdConnection = false;
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
      createdConnection = true;
    }
    const [userCount, projectCount, taskCount] = await Promise.all([
      User.countDocuments(),
      Project.countDocuments(),
      Task.countDocuments(),
    ]);

    if (userCount > 0 && projectCount > 0 && taskCount > 0) {
      console.log('Seeding skipped: collections already contain data');
      return { seeded: false };
    }

    const users = userCount === 0 ? await seedUsers() : await User.find({});
    const projects = projectCount === 0 ? await seedProjects(users) : await Project.find({});
    if (taskCount === 0) {
      await seedTasks(users, projects);
    }

    console.log('✅ ensure seed completed');
    return { seeded: true };
  } catch (error) {
    console.error('Error in seedIfEmpty:', error);
    throw error;
  } finally {
    if (createdConnection) {
      await mongoose.disconnect();
    }
  }
};

module.exports = { seedData, seedIfEmpty };
