import { Injectable, NotAcceptableException } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PrismaService } from 'src/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export const roundsOfHashing = 10;
@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    file: Express.Multer.File,
  ): Promise<User> {
    let userData = createUserDto;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      roundsOfHashing,
    );

    createUserDto.password = hashedPassword;

    // Check if a file is provided
    if (file) {
      // Upload the file to Cloudinary
      const cloudinaryResponse = await this.cloudinary.uploadFile(file);
      // Update the user data with the Cloudinary URL
      userData = {
        ...userData,
        imageUrl: cloudinaryResponse.secure_url,
        imageId: cloudinaryResponse.public_id,
      };
    }

    return this.prisma.user.create({
      data: userData,
    });
  }

  findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  findOne(id: number): Promise<User> {
    return this.prisma.user.findUniqueOrThrow({
      where: {
        id,
      },
    });
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    file: Express.Multer.File,
  ): Promise<User> {
    let userData = updateUserDto;

    // Check if a file is provided
    if (file) {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: {
          id,
        },
      });

      if (user.imageUrl) this.cloudinary.deleteFile(user.imageId);
      // Upload the file to Cloudinary
      const cloudinaryResponse = await this.cloudinary.uploadFile(file);
      // Update the user data with the Cloudinary URL
      userData = {
        ...userData,
        imageUrl: cloudinaryResponse.secure_url,
        imageId: cloudinaryResponse.public_id,
      };
    }

    // Update the user in the database
    return this.prisma.user.update({
      where: { id },
      data: userData,
    });
  }

  async changePassword(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: {
        id,
      },
    });

    // Verify the old password
    const isOldPasswordValid = await bcrypt.compare(
      updateUserDto.oldPassword,
      user.password,
    );

    if (!isOldPasswordValid) {
      throw new NotAcceptableException('Invalid old password');
    }

    // Hash the new password before updating
    const hashedPassword = await bcrypt.hash(
      updateUserDto.password,
      roundsOfHashing,
    );

    // Update the user's password

    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        password: hashedPassword,
      },
    });
  }

  remove(id: number): Promise<User> {
    return this.prisma.user.delete({
      where: {
        id,
      },
    });
  }
}
