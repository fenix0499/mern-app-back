const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt-nodejs");
const jwt = require("../services/jwt");
const User = require("../models/user");

function singUp(req, res) {
  const user = new User();
  const { name, lastname, email, password, repeatPassword } = req.body;

  user.name = name;
  user.lastname = lastname;
  user.email = email.toLowerCase();
  user.role = "admin";
  user.active = "false";

  if (!password || !repeatPassword) {
    res.status(404).send({ message: "Uno de los campos esta vacio..." });
  } else if (password != repeatPassword) {
    res.status(404).send({ message: "Hay un error en la contrasenia..." });
  } else {
    bcrypt.hash(password, null, null, (err, hash) => {
      if (err) {
        res
          .status(500)
          .send({ message: "Error al crear el hash de la contrasenia..." });
      } else {
        user.password = hash;
        user.save((err, userStored) => {
          if (err) {
            res.status(500).send({ message: "El usuario ya existe..." });
          } else if (!userStored) {
            res.status(404).send({ message: "Error al crear el usuario..." });
          } else {
            res.status(200).send({ user: userStored });
          }
        });
      }
    });
  }
}

function singIn(req, res) {
  const params = req.body;
  const email = params.email.toLowerCase();
  const password = params.password;

  User.findOne({ email }, (err, userStored) => {
    if (err) {
      res.status(500).send({ message: "Error del servidor... 1" });
    } else if (!userStored) {
      res.status(404).send({ message: "Usuario no encontrado..." });
    } else {
      bcrypt.compare(password, userStored.password, (err, check) => {
        if (err) {
          res.status(500).send({ message: err });
        } else if (!check) {
          res.status(404).send({ message: "La contrasenia es incorrecta..." });
        } else if (!userStored.active) {
          res
            .status(200)
            .send({ code: 200, message: "El usuario no esta activo..." });
        } else {
          res.status(200).send({
            accessToken: jwt.createAccessToken(userStored),
            refreshToken: jwt.createRefreshToken(userStored),
          });
        }
      });
    }
  });
}

function getUsers(req, res) {
  User.find().then((users) => {
    if (!users) {
      res
        .status(404)
        .send({ message: "No se ha encontrado ningun usuario..." });
    } else {
      res.status(200).send({ users });
    }
  });
}

function getUsersActive(req, res) {
  const query = req.query;

  User.find({ active: query.active }).then((users) => {
    if (!users) {
      res
        .status(404)
        .send({ message: "No se ha encontrado ningun usuario..." });
    } else {
      res.status(200).send({ users });
    }
  });
}

function uploadAvatar(req, res) {
  const params = req.params;

  User.findById({ _id: params.id }, (err, userData) => {
    if (err) {
      res.status(500).send({ message: "Error del servidor..." });
    } else if (!userData) {
      res
        .status(404)
        .send({ message: "No se ha encontrado ningun usuario..." });
    } else {
      let user = userData;

      if (req.files) {
        let filePath = req.files.avatar.path;
        let fileSplit = filePath.split("\\");
        let fileName = fileSplit[2];

        let extSplit = fileName.split(".");
        console.log(extSplit);
        let fileExt = extSplit[1];
        if (fileExt !== "png" && fileExt !== "jpg") {
          res.status(400).send({ message: "Imagen no valida..." });
        } else {
          user.avatar = fileName;
          User.findByIdAndUpdate(
            { _id: params.id },
            user,
            (err, userResult) => {
              if (err) {
                res.status(500).send({ message: "Error del servidor..." });
              } else if (!userResult) {
                res.status(404).send({ message: "Usuario no encontrado..." });
              } else {
                res.status(200).send({ avatar: fileName });
              }
            }
          );
        }
      }
    }
  });
}

function getAvatar(req, res) {
  const avatarName = req.params.avatarName;
  const filePath = "./uploads/avatar/" + avatarName;

  fs.exists(filePath, (exists) => {
    if (!exists) {
      res.status(404).send({ message: "Avatar no encontrado..." });
    } else {
      res.sendFile(path.resolve(filePath));
    }
  });
}

async function updateUser(req, res) {
  let userData = req.body;
  userData.email = req.body.email.toLowerCase();
  const params = req.params;

  if (userData.password) {
    await bcrypt.hash(userData.password, null, null, (err, hash) => {
      if (err) {
        res.status(500).send({ message: "Error al hashear la contrasenia..." });
      } else {
        userData.password = hash;
      }
    });
  }

  User.findByIdAndUpdate({ _id: params.id }, userData, (err, userUpdate) => {
    if (err) {
      res.status(500).send({ message: "Error del servidor..." });
    } else if (!userUpdate) {
      res.status(404).send({ message: "Usuario no encontrado..." });
    } else {
      res.status(200).send({ message: "Usuario actualizado!" });
      delete userData.password;
      delete userData.repeatPassword;
    }
  });
}

function activateUser(req, res) {
  const { id } = req.params;
  const { active } = req.body;

  User.findByIdAndUpdate(id, { active }, (err, userStored) => {
    if (err) {
      res.status(500).send({ message: "Error del servidor..." });
    } else if (!userStored) {
      res.status(404).send({ message: "Usuario no encontrado..." });
    } else if (active === true) {
      res.status(200).send({ message: "Usuario activado!!!" });
    } else {
      res.status(200).send({ message: "Usuario desactivado!!!" });
    }
  });
}

function deleteUser(req, res) {
  const { id } = req.params;
  User.findByIdAndRemove(id, (err, userDeleted) => {
    if (err) {
      res.status(500).send({ message: "Error del servidor..." });
    } else if (!userDeleted) {
      res.status(404).send({ message: "Usuario no encontrado..." });
    } else {
      res.status(200).send({ message: "Usuario eliminado!!!" });
    }
  });
}

function singUpAdmin(req, res) {
  const user = new User();
  const { name, lastname, email, role, password } = req.body;
  user.name = name;
  user.lastname = lastname;
  user.email = email.toLowerCase();
  user.role = role;
  user.active = true;

  if (!password) {
    res.status(500).send({ message: "La contrasenia es obligatoria" });
  } else {
    bcrypt.hash(password, null, null, (err, hash) => {
      if (err) {
        res.status(500).send({ message: "Error del servidor..." });
      } else {
        user.password = hash;
        user.save((err, userStored) => {
          if (err) {
            res.status(500).send({ message: "El usuario ya existe..." });
          } else if (!userStored) {
            res.status(500).send({ message: "Error al crear usuario..." });
          } else {
            res.status(200).send({ user: userStored });
          }
        });
      }
    });
  }
}

module.exports = {
  singUp,
  singIn,
  getUsers,
  getUsersActive,
  uploadAvatar,
  getAvatar,
  updateUser,
  activateUser,
  deleteUser,
  singUpAdmin,
};
