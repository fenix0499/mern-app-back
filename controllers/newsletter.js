const Newsletter = require("../models/newsletter");

function suscribeEmail(req, res) {
  const { email } = req.params;
  const newsletter = Newsletter();

  if (!email) {
    res.status(404).send({ code: 404, message: "El email es obligatorio..." });
  } else {
    newsletter.email = email.toLowerCase();

    newsletter.save((err, createdNewsletter) => {
      console.log(newsletter);
      if (err) {
        res.status(500).send({ code: 500, message: "El correo ya existe..." });
      } else if (!createdNewsletter) {
        res.status(404).send({ code: 404, message: "Error al guardar el correo..." });
      } else {
        res.status(200).send({ code: 200, message: "Correo guardado!!!" });
      }
    });
  }
}

module.exports = {
  suscribeEmail,
};
